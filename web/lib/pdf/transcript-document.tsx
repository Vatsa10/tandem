import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export interface TranscriptDocumentChunk {
  speaker: string | null;
  startMs: number;
  text: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#15171D",
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  meta: {
    fontSize: 9,
    color: "#5B5D66",
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 12,
    marginBottom: 6,
  },
  summary: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  chunk: {
    marginBottom: 8,
  },
  chunkHeader: {
    flexDirection: "row",
    marginBottom: 2,
  },
  speaker: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 9,
    color: "#5B5D66",
  },
  chunkText: {
    fontSize: 10,
    lineHeight: 1.4,
  },
});

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function TranscriptDocument({
  title,
  dateLabel,
  summary,
  chunks,
}: {
  title: string;
  dateLabel: string | null;
  summary: string | null;
  chunks: TranscriptDocumentChunk[];
}) {
  return (
    <Document title={title}>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>
          {dateLabel ?? "Date unknown"} · Transcribed by Tandem
        </Text>

        {summary && (
          <View>
            <Text style={styles.sectionHeading}>Summary</Text>
            <Text style={styles.summary}>{summary}</Text>
          </View>
        )}

        <Text style={styles.sectionHeading}>Transcript</Text>
        {chunks.map((chunk, i) => (
          <View key={i} style={styles.chunk} wrap={false}>
            <View style={styles.chunkHeader}>
              <Text style={styles.speaker}>{chunk.speaker ?? "Unknown"}</Text>
              <Text style={styles.timestamp}>
                {formatTimestamp(chunk.startMs)}
              </Text>
            </View>
            <Text style={styles.chunkText}>{chunk.text}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
