import {
  lazy,
  Suspense,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CsvImportError, isCholeraMeasure, parseWaterCsv, type CsvImportResult, type WaterObservation } from "@/lib/water-data";
import MumbaiWaterImage from "@/assets/mumbai-water-dashboard.jpg";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleAlert,
  CloudUpload,
  Compass,
  Database,
  FileSpreadsheet,
  LocateFixed,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Waves,
} from "lucide-react";

const MumbaiWaterMap = lazy(() => import("@/components/MumbaiWaterMap").then((module) => ({ default: module.MumbaiWaterMap })));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tidewatch — Mumbai Water Quality Monitor" },
      {
        name: "description",
        content: "Explore Mumbai water-quality observations, map sample locations, and check the evidence behind cholera and climate-risk monitoring.",
      },
      { property: "og:title", content: "Tidewatch — Mumbai Water Quality Monitor" },
      {
        property: "og:description",
        content: "A data-led field desk for Mumbai water observations and public health awareness.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dataset, setDataset] = useState<CsvImportResult | null>(null);
  const [selectedMeasure, setSelectedMeasure] = useState("all");
  const [uploadError, setUploadError] = useState("");
  const [fileName, setFileName] = useState("");

  const measurements = useMemo(() => {
    if (!dataset) return [];
    return [...new Set(dataset.observations.map(({ measure }) => measure))].sort((a, b) => a.localeCompare(b));
  }, [dataset]);

  const visibleObservations = useMemo(() => {
    if (!dataset) return [];
    if (selectedMeasure === "all") return dataset.observations;
    return dataset.observations.filter(({ measure }) => measure === selectedMeasure);
  }, [dataset, selectedMeasure]);

  const choleraSamples = useMemo(
    () => dataset?.observations.filter(({ measure }) => isCholeraMeasure(measure)).length ?? 0,
    [dataset],
  );

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError("");

    try {
      const contents = await file.text();
      const parsed = parseWaterCsv(contents);
      setDataset(parsed);
      setFileName(file.name);
      setSelectedMeasure("all");
    } catch (error) {
      setUploadError(error instanceof CsvImportError ? error.message : "We couldn't read that file. Please check it and try again.");
    } finally {
      event.target.value = "";
    }
  }

  function downloadCsv() {
    if (!dataset) return;
    const columns = ["area", "measure", "value", "unit", "observed_at", "latitude", "longitude"];
    const quote = (value: string | number | null) => {
      const text = value === null ? "" : String(value);
      return `"${text.replaceAll('"', '""')}"`;
    };
    const lines = [columns.join(","), ...visibleObservations.map((item) => [item.area, item.measure, item.value, item.unit, item.observedAt, item.latitude, item.longitude].map(quote).join(","))];
    const file = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mumbai-water-observations.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="relative z-10 flex min-h-16 items-center justify-between border-b border-border bg-background/95 px-5 md:px-10">
        <a href="#top" className="flex items-center gap-3" aria-label="Tidewatch Mumbai home">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Waves className="size-5" aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg">Tidewatch</span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Mumbai field desk</span>
          </span>
        </a>

        <div className="flex items-center gap-4">
          <span className="hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:flex">
            <span className="size-2 rounded-full bg-accent" /> Dataset not connected
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <CloudUpload aria-hidden="true" /> Add CSV
          </Button>
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept=".csv,text/csv"
            aria-label="Choose water-quality CSV"
            onChange={handleFileChange}
          />
        </div>
      </header>

      <section id="top" className="relative isolate overflow-hidden">
        <img
          src={MumbaiWaterImage}
          alt="Mumbai waterfront and city skyline"
          width={1600}
          height={912}
          fetchPriority="high"
          className="absolute inset-0 -z-20 size-full object-cover object-center"
        />
        <div className="dashboard-cover absolute inset-0 -z-10" />
        <div className="mx-auto flex min-h-[410px] max-w-[1440px] flex-col justify-between px-5 pb-8 pt-8 text-primary-foreground md:min-h-[458px] md:px-12 md:pb-10 md:pt-12">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-primary-foreground/75">
            <span className="size-2 rounded-full bg-accent" /> Mumbai · water & climate watch
          </div>
          <div className="max-w-3xl py-12">
            <p className="mb-4 flex items-center gap-2 text-sm font-medium text-primary-foreground/80">
              <Compass className="size-4" aria-hidden="true" /> Evidence first. Community always.
            </p>
            <h1 className="max-w-2xl font-display text-5xl leading-[1.04] md:text-7xl">
              A clearer view of Mumbai’s water.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-primary-foreground/85 md:text-lg">
              Explore local observations, understand the signals, and see what the data can—and cannot—tell us.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button type="button" size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => fileInputRef.current?.click()}>
                <CloudUpload aria-hidden="true" /> {dataset ? "Replace dataset" : "Load your dataset"}
                <ArrowRight aria-hidden="true" />
              </Button>
              <a href="#map" className="inline-flex h-10 items-center gap-2 rounded-md border border-primary-foreground/40 px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/10">
                Open the map <ArrowDownToLine className="size-4 rotate-[-45deg]" aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-primary-foreground/25 pt-4 text-xs text-primary-foreground/75">
            <span>Field notes for a changing climate</span>
            <a href="#context" className="inline-flex items-center gap-1 hover:text-primary-foreground">
              Read the water-health context <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section aria-label="Dataset summary" className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-[1440px] divide-y divide-border px-5 sm:grid-cols-2 sm:divide-x sm:divide-y-0 md:grid-cols-4 md:px-12">
          <SummaryMetric icon={<FileSpreadsheet aria-hidden="true" />} label="Water readings" value={dataset ? visibleObservations.length.toLocaleString() : "—"} detail={dataset ? "From your uploaded CSV" : "Awaiting dataset"} />
          <SummaryMetric icon={<MapPinned aria-hidden="true" />} label="Areas found" value={dataset ? dataset.areas.length.toLocaleString() : "—"} detail={dataset ? "Named in the dataset" : "Mumbai locations"} />
          <SummaryMetric icon={<LocateFixed aria-hidden="true" />} label="Mapped samples" value={dataset ? dataset.mappedSamples.toLocaleString() : "—"} detail={dataset ? "Rows with coordinates" : "Needs latitude + longitude"} />
          <SummaryMetric icon={<ShieldCheck aria-hidden="true" />} label="Cholera indicators" value={dataset ? choleraSamples.toLocaleString() : "—"} detail={dataset ? "Matching measure names" : "Only if present in CSV"} />
        </div>
      </section>

      <section id="map" className="mx-auto max-w-[1440px] px-5 py-10 md:px-12 md:py-14">
        <div className="mb-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.17em] text-primary">Mumbai overview</p>
            <h2 className="font-display text-3xl md:text-4xl">Observations by location</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              The map starts at Mumbai. It only places sample points when the CSV includes coordinates; area names alone are not geocoded.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {dataset && measurements.length > 0 && (
              <label className="relative inline-flex h-9 items-center gap-2 rounded-md border border-input bg-card pl-3 pr-8 text-sm">
                <span className="sr-only">Filter by measurement</span>
                <select
                  aria-label="Filter by measurement"
                  className="max-w-44 appearance-none bg-transparent pr-1 text-foreground outline-none"
                  value={selectedMeasure}
                  onChange={(event) => setSelectedMeasure(event.target.value)}
                >
                  <option value="all">All measurements</option>
                  {measurements.map((measure) => <option key={measure} value={measure}>{measure}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 size-4 text-muted-foreground" aria-hidden="true" />
              </label>
            )}
            {dataset && (
              <Button type="button" variant="outline" size="sm" onClick={downloadCsv}>
                <ArrowDownToLine aria-hidden="true" /> Export view
              </Button>
            )}
          </div>
        </div>

        {uploadError && (
          <div role="alert" className="mb-5 flex items-start gap-3 border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-foreground">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <span>{uploadError}</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(270px,0.8fr)]">
          <div className="overflow-hidden border border-border bg-card shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MapPinned className="size-4 text-primary" aria-hidden="true" /> Greater Mumbai
              </div>
              <span className="text-xs text-muted-foreground">OpenStreetMap</span>
            </div>
            <div className="h-[350px] sm:h-[440px]">
              <Suspense fallback={<div className="flex h-full items-center justify-center bg-muted text-sm text-muted-foreground">Opening Mumbai map…</div>}>
                <MumbaiWaterMap observations={visibleObservations} />
              </Suspense>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-2"><span className="map-pin size-3" /> Sample location from uploaded coordinates</span>
              <span>© OpenStreetMap contributors</span>
            </div>
          </div>

          <aside className="flex flex-col border-y border-border py-5 lg:border-y-0 lg:border-l lg:pl-6 lg:py-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Dataset detail</p>
                <h3 className="mt-2 font-display text-2xl">Area readings</h3>
              </div>
              <Database className="size-5 text-primary" aria-hidden="true" />
            </div>

            {dataset ? (
              <>
                <p className="mt-2 break-all text-xs text-muted-foreground">{fileName}</p>
                <div className="mt-5 flex items-center gap-2 border-l-2 border-primary bg-secondary/60 px-3 py-2.5 text-xs leading-5 text-secondary-foreground">
                  <Check className="size-4 shrink-0" aria-hidden="true" />
                  {dataset.observations.length.toLocaleString()} reading{dataset.observations.length === 1 ? "" : "s"} · {dataset.areas.length} area{dataset.areas.length === 1 ? "" : "s"} recognized
                </div>
                {dataset.areas.length > 0 ? (
                  <ul className="mt-3 max-h-64 divide-y divide-border overflow-y-auto pr-1">
                    {dataset.areas.map((area) => {
                      const count = visibleObservations.filter((observation) => observation.area === area).length;
                      return (
                        <li key={area} className="flex items-center justify-between gap-3 py-3">
                          <span className="min-w-0 truncate text-sm font-medium">{area}</span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{count} reading{count === 1 ? "" : "s"}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : <p className="py-5 text-sm text-muted-foreground">No areas found for this filter.</p>}
              </>
            ) : (
              <div className="mt-5 flex flex-1 flex-col items-start justify-center border-y border-border py-8">
                <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-primary"><FileSpreadsheet className="size-5" aria-hidden="true" /></span>
                <h4 className="mt-4 text-sm font-semibold">Your CSV starts the picture.</h4>
                <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                  Bring water readings by area. Add latitude and longitude to place samples on the map.
                </p>
                <Button type="button" variant="outline" className="mt-5" onClick={() => fileInputRef.current?.click()}>
                  <CloudUpload aria-hidden="true" /> Choose CSV
                </Button>
              </div>
            )}

            <div className="mt-auto border-t border-border pt-4">
              <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                This preview reads your file in the browser. Uploaded observations are not saved to the database.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-y border-border bg-secondary/50">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-9 md:grid-cols-[1fr_2fr] md:items-center md:px-12 md:py-11">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"><Sparkles className="size-5" aria-hidden="true" /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">XGBoost readiness</p>
              <h2 className="mt-1 font-display text-2xl">Evidence before prediction</h2>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              A useful model needs dated water and climate features plus verified cholera outcome labels. A water-quality CSV alone can map readings, but cannot support an outbreak forecast.
            </p>
            <span className="inline-flex w-fit shrink-0 items-center gap-2 border border-border bg-background px-3 py-2 text-xs font-medium">
              <span className="size-2 rounded-full bg-accent" /> {dataset ? "Awaiting labeled training data" : "Awaiting CSV"}
            </span>
          </div>
        </div>
      </section>

      <section id="context" className="mx-auto max-w-[1440px] px-5 py-12 md:px-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] md:items-start">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.17em] text-primary">Water-health context</p>
            <h2 className="font-display text-3xl leading-tight md:text-4xl">Climate signals are context, not a diagnosis.</h2>
          </div>
          <div className="grid gap-0 sm:grid-cols-2 sm:divide-x sm:divide-border">
            <ContextNote title="What cholera is" body="Cholera is an infection caused by Vibrio cholerae. Unsafe water and food can transmit it; a water-quality measurement alone does not confirm cholera or a local outbreak." />
            <ContextNote title="What El Niño can tell us" body="El Niño can shift rainfall patterns, but it does not by itself show that Mumbai’s water is contaminated. Local, dated sample and health-surveillance data are needed." />
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-3 px-5 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center md:px-12">
          <span className="font-display text-base text-foreground">Tidewatch <span className="font-sans text-xs text-muted-foreground">· Mumbai water field desk</span></span>
          <span>Public-health information only · Not a substitute for official advisories</span>
        </div>
      </footer>
    </main>
  );
}

function SummaryMetric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="flex min-h-24 items-center gap-3 py-4 sm:px-5 first:sm:pl-0 md:min-h-28 md:px-7 md:first:pl-0">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
        <p className="truncate text-[11px] text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function ContextNote({ title, body }: { title: string; body: string }) {
  return (
    <article className="py-1 sm:px-6 first:sm:pl-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </article>
  );
}