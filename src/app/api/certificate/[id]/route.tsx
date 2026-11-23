import { Document, Page, renderToBuffer, StyleSheet, Svg, Text, View, Path, Ellipse, Rect } from "@react-pdf/renderer";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { canViewPlayer, getAccess } from "@/lib/authz";

const GREEN = "#0f5132";
const GOLD = "#d49b00";

const s = StyleSheet.create({
  page: { padding: 28, backgroundColor: "#fffdf6", fontFamily: "Helvetica" },
  frame: { flex: 1, borderWidth: 6, borderColor: GREEN, padding: 6 },
  inner: { flex: 1, borderWidth: 1.5, borderColor: GOLD, alignItems: "center", justifyContent: "center", paddingHorizontal: 48 },
  club: { fontSize: 13, letterSpacing: 3, color: GREEN, fontFamily: "Helvetica-Bold", marginTop: 6 },
  kind: { fontSize: 11, letterSpacing: 2, color: "#6b7280", marginTop: 18 },
  title: { fontSize: 40, fontFamily: "Helvetica-Bold", color: GREEN, marginTop: 6, textAlign: "center" },
  presented: { fontSize: 13, color: "#374151", marginTop: 22 },
  name: { fontSize: 46, fontFamily: "Times-BoldItalic", color: "#111827", marginTop: 6, textAlign: "center" },
  rule: { width: 320, height: 2, backgroundColor: GOLD, marginTop: 6 },
  reason: { fontSize: 14, color: "#374151", marginTop: 18, textAlign: "center", maxWidth: 520, lineHeight: 1.4 },
  footer: { flexDirection: "row", width: "100%", justifyContent: "space-between", marginTop: 40, paddingHorizontal: 30 },
  sigBox: { alignItems: "center", width: 200 },
  sigLine: { width: 200, height: 1, backgroundColor: "#9ca3af", marginBottom: 4 },
  sigLabel: { fontSize: 10, color: "#6b7280" },
  sigValue: { fontSize: 13, color: "#111827", marginBottom: 4 },
});

const KIND = { player_of_week: "PLAYER OF THE WEEK", certificate: "CERTIFICATE OF ACHIEVEMENT", badge: "AWARD", milestone: "MILESTONE" } as const;

function Ball() {
  return (
    <Svg width={70} height={70} viewBox="0 0 40 40">
      <Rect x={0} y={0} width={40} height={40} rx={11} fill={GREEN} />
      <Path d="M12 9v22M28 9v22M12 21h16" stroke={GOLD} strokeWidth={2.6} />
      <Ellipse cx={20} cy={16} rx={7.5} ry={4.6} fill="#ffffff" transform="rotate(-28 20 16)" />
    </Svg>
  );
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAccess();
  if (!ctx) return new Response("Unauthorised", { status: 401 });
  const { id } = await params;
  const [row] = await db
    .select({ a: schema.awards, p: schema.players, by: schema.users.name, group: schema.ageGroups.name })
    .from(schema.awards)
    .innerJoin(schema.players, eq(schema.players.id, schema.awards.playerId))
    .leftJoin(schema.users, eq(schema.users.id, schema.awards.awardedBy))
    .leftJoin(schema.ageGroups, eq(schema.ageGroups.id, schema.players.ageGroupId))
    .where(eq(schema.awards.id, id));
  if (!row || !canViewPlayer(ctx, row.p)) return new Response("Not found", { status: 404 });

  const date = new Date(row.a.awardedOn + "T12:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const buf = await renderToBuffer(
    <Document title={`${row.a.title}: ${row.p.firstName} ${row.p.lastName}`} author="Minis Coach">
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.frame}>
          <View style={s.inner}>
            <Ball />
            <Text style={s.club}>MINIS RUGBY{row.group ? ` · ${row.group.toUpperCase()}` : ""}</Text>
            <Text style={s.kind}>{KIND[row.a.type]}</Text>
            <Text style={s.title}>{row.a.title}</Text>
            <Text style={s.presented}>proudly presented to</Text>
            <Text style={s.name}>{row.p.firstName} {row.p.lastName}</Text>
            <View style={s.rule} />
            {row.a.reason ? <Text style={s.reason}>{row.a.reason}</Text> : null}
            <View style={s.footer}>
              <View style={s.sigBox}>
                <Text style={s.sigValue}>{date}</Text>
                <View style={s.sigLine} />
                <Text style={s.sigLabel}>Date</Text>
              </View>
              <View style={s.sigBox}>
                <Text style={s.sigValue}>{row.by ?? ""}</Text>
                <View style={s.sigLine} />
                <Text style={s.sigLabel}>Coach</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>,
  );
  const filename = `${row.a.title}-${row.p.firstName}-${row.p.lastName}.pdf`.replace(/[^\w.-]+/g, "_");
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${filename}"`, "Cache-Control": "private, no-store" },
  });
}
