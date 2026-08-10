import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import PptxGenJS from "pptxgenjs";
import type { StudySet, Model } from "@/types";
import { FileText, Presentation, Download, Loader2, CheckCircle2 } from "lucide-react";
import { SharePanel } from "@/components/SharePanel";

interface ExportTabProps {
  data: StudySet;
  model?: Model;
  savedId?: string;
}

export function ExportTab({ data, model, savedId }: ExportTabProps) {
  const [pdfState, setPdfState] = useState<"idle" | "loading" | "done">("idle");
  const [pptxState, setPptxState] = useState<"idle" | "loading" | "done">("idle");

  const safeFileName = data.topic.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase() || "study_set";

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const buildPdf = async () => {
    setPdfState("loading");
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageSize: [number, number] = [612, 792];
    const margin = 60;
    const lineHeight = 16;
    const wrapWidth = pageSize[0] - margin * 2;

    const addWrappedText = (
      page: import("pdf-lib").PDFPage,
      text: string,
      x: number,
      startY: number,
      options: { font?: import("pdf-lib").PDFFont; size?: number; lineHeight?: number; color?: import("pdf-lib").Color } = {}
    ) => {
      const opts = {
        size: 12,
        lineHeight: lineHeight,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
        ...options,
      };
      const lines = text.split("\n").flatMap((line) => {
        if (!line.trim()) return [""];
        const words = line.split(" ");
        const result: string[] = [];
        let current = "";
        for (const word of words) {
          const test = current ? `${current} ${word}` : word;
          const width = opts.font.widthOfTextAtSize(test, opts.size);
          if (width > wrapWidth && current) {
            result.push(current);
            current = word;
          } else {
            current = test;
          }
        }
        if (current) result.push(current);
        return result;
      });

      let y = startY;
      lines.forEach((line) => {
        page.drawText(line, {
          x,
          y,
          size: opts.size,
          font: opts.font,
          color: opts.color,
          lineHeight: opts.lineHeight,
        });
        y -= opts.lineHeight;
      });
      return y;
    };

    let currentPage = pdfDoc.addPage(pageSize);
    const { height } = currentPage.getSize();
    let y = height - margin;

    currentPage.drawText(data.topic, {
      x: margin,
      y,
      size: 28,
      font: boldFont,
      color: rgb(0.125, 0.125, 0.125),
    });
    y -= 40;

    currentPage.drawText(`Scope: ${data.scope}`, {
      x: margin,
      y,
      size: 14,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
    y -= 50;

    currentPage.drawText("Summary", {
      x: margin,
      y,
      size: 18,
      font: boldFont,
      color: rgb(0.125, 0.125, 0.125),
    });
    y -= 28;
    y = addWrappedText(currentPage, data.summary, margin, y, { size: 12 });
    y -= 32;

    currentPage.drawText("Key Takeaways", {
      x: margin,
      y,
      size: 18,
      font: boldFont,
      color: rgb(0.125, 0.125, 0.125),
    });
    y -= 28;

    data.keyTakeaways.forEach((takeaway) => {
      const bullet = `• ${takeaway}`;
      y = addWrappedText(currentPage, bullet, margin, y, { size: 11 });
      y -= 6;
    });

    data.subtopics.forEach((subtopic) => {
      currentPage = pdfDoc.addPage(pageSize);
      y = height - margin;

      currentPage.drawText(subtopic.title, {
        x: margin,
        y,
        size: 24,
        font: boldFont,
        color: rgb(0.125, 0.125, 0.125),
      });
      y -= 40;

      y = addWrappedText(currentPage, subtopic.summary, margin, y, { size: 12 });
      y -= 28;

      currentPage.drawText("Objectives", {
        x: margin,
        y,
        size: 16,
        font: boldFont,
        color: rgb(0.125, 0.125, 0.125),
      });
      y -= 24;
      subtopic.objectives.forEach((objective, i) => {
        y = addWrappedText(currentPage, `${i + 1}. ${objective}`, margin, y, { size: 11 });
        y -= 6;
      });
      y -= 20;

      currentPage.drawText("Key Concepts", {
        x: margin,
        y,
        size: 16,
        font: boldFont,
        color: rgb(0.125, 0.125, 0.125),
      });
      y -= 24;

      subtopic.keyConcepts.forEach((concept) => {
        y = addWrappedText(currentPage, `• ${concept.concept}`, margin, y, { size: 11, font: boldFont });
        concept.details.forEach((detail) => {
          y = addWrappedText(currentPage, `  - ${detail}`, margin, y, { size: 10 });
        });
        y -= 10;
      });
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
    new Uint8Array(pdfBuffer).set(pdfBytes);
    download(new Blob([pdfBuffer], { type: "application/pdf" }), `${safeFileName}_study_set.pdf`);
    setPdfState("done");
    setTimeout(() => setPdfState("idle"), 2000);
  };

  const buildPptx = async () => {
    setPptxState("loading");
    const pptx = new PptxGenJS();
    pptx.title = data.topic;
    pptx.subject = `StudyForge ${data.scope} scope lesson`;
    pptx.author = "StudyForge";
    pptx.layout = "LAYOUT_16x9";

    pptx.defineSlideMaster({
      title: "MASTER_SLIDE",
      background: { color: "FAF5FF" },
      objects: [
        { rect: { x: 0, y: 0, w: "100%", h: 0.25, fill: { color: "7C3AED" } } },
        { text: { text: "StudyForge", options: { x: 0.5, y: 7.1, w: 2, h: 0.25, fontSize: 10, color: "7C3AED", bold: true } } },
      ],
    });

    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: "FFFFFF" };
    titleSlide.addText(data.topic, { x: 1, y: 2.5, w: 8, h: 1.5, fontSize: 40, bold: true, color: "7C3AED", align: "center" });
    titleSlide.addText(`${data.scope} scope · StudyForge Lesson`, { x: 1, y: 4.2, w: 8, h: 0.5, fontSize: 18, color: "475569", align: "center" });

    const summarySlide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
    summarySlide.addText("Summary", { x: 0.5, y: 0.6, w: 9, h: 0.6, fontSize: 28, bold: true, color: "0F172A" });
    summarySlide.addText(data.summary, { x: 0.5, y: 1.5, w: 9, h: 4, fontSize: 16, color: "334155", valign: "top" });

    const takeawaysSlide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
    takeawaysSlide.addText("Key Takeaways", { x: 0.5, y: 0.6, w: 9, h: 0.6, fontSize: 28, bold: true, color: "0F172A" });
    takeawaysSlide.addText(
      data.keyTakeaways.map((t) => ({ text: `• ${t}`, options: { breakLine: true } })),
      { x: 0.5, y: 1.5, w: 9, h: 4.5, fontSize: 16, color: "334155", valign: "top", bullet: false }
    );

    data.subtopics.forEach((subtopic) => {
      const overviewSlide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
      overviewSlide.addText(subtopic.title, { x: 0.5, y: 0.6, w: 9, h: 0.6, fontSize: 28, bold: true, color: "0F172A" });
      overviewSlide.addText(subtopic.summary, { x: 0.5, y: 1.4, w: 9, h: 2.5, fontSize: 16, color: "334155", valign: "top" });
      overviewSlide.addText("Objectives", { x: 0.5, y: 4.2, w: 9, h: 0.4, fontSize: 18, bold: true, color: "059669" });
      overviewSlide.addText(
        subtopic.objectives.map((o, i) => ({ text: `${i + 1}. ${o}`, options: { breakLine: true } })),
        { x: 0.5, y: 4.7, w: 9, h: 2, fontSize: 14, color: "334155", valign: "top" }
      );

      subtopic.keyConcepts.forEach((concept) => {
        const conceptSlide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
        conceptSlide.addText(concept.concept, { x: 0.5, y: 0.6, w: 9, h: 0.6, fontSize: 26, bold: true, color: "0F172A" });
        conceptSlide.addText(
          concept.details.map((d) => ({ text: `• ${d}`, options: { breakLine: true } })),
          { x: 0.5, y: 1.5, w: 9, h: 4.5, fontSize: 16, color: "334155", valign: "top" }
        );
      });
    });

    const pptxBlob = await pptx.write({ outputType: "blob" });
    if (pptxBlob instanceof Blob) {
      download(pptxBlob, `${safeFileName}_study_set.pptx`);
    }
    setPptxState("done");
    setTimeout(() => setPptxState("idle"), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
      <article className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-2">Export your study set</h3>
        <p className="text-foreground/70 mb-6">
          Take your lesson offline. Download a PDF summary or a PowerPoint deck you can edit and present.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <ExportButton
            icon={<FileText className="w-5 h-5" />}
            label="Download PDF"
            description="Formatted summary and subtopic notes."
            state={pdfState}
            onClick={buildPdf}
            accent="primary"
          />
          <ExportButton
            icon={<Presentation className="w-5 h-5" />}
            label="Download PowerPoint"
            description="Slides for each subtopic and concept."
            state={pptxState}
            onClick={buildPptx}
            accent="secondary"
          />
        </div>
      </article>

      <SharePanel studySet={data} model={model} savedId={savedId} />
    </div>
  );
}

interface ExportButtonProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  state: "idle" | "loading" | "done";
  onClick: () => void;
  accent: "primary" | "secondary";
}

function ExportButton({ icon, label, description, state, onClick, accent }: ExportButtonProps) {
  const isLoading = state === "loading";
  const isDone = state === "done";

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`group relative flex items-start gap-4 rounded-2xl border p-5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        isLoading
          ? "bg-muted border-border cursor-wait"
          : isDone
          ? "bg-green-50 border-green-200"
          : accent === "primary"
          ? "bg-white border-border hover:border-primary/40 hover:shadow-sm hover:-translate-y-0.5 cursor-pointer"
          : "bg-white border-border hover:border-secondary/40 hover:shadow-sm hover:-translate-y-0.5 cursor-pointer"
      }`}
    >
      <span
        className={`inline-flex h-11 w-11 items-center justify-center rounded-xl shrink-0 transition-colors ${
          isDone
            ? "bg-green-100 text-green-700"
            : accent === "primary"
            ? "bg-primary/10 text-primary group-hover:bg-primary/20"
            : "bg-secondary/10 text-secondary group-hover:bg-secondary/20"
        }`}
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isDone ? <CheckCircle2 className="w-5 h-5" /> : icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground">{isDone ? "Downloaded" : label}</span>
          {!isLoading && !isDone && <Download className="w-4 h-4 text-foreground/40 group-hover:text-foreground/70 transition-colors" />}
        </div>
        <p className="text-sm text-foreground/60 mt-1">{isDone ? "Check your downloads folder." : description}</p>
      </div>
    </button>
  );
}
