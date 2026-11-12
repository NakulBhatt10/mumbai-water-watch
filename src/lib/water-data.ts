import Papa from "papaparse";

export type WaterObservation = {
  id: string;
  area: string;
  measure: string;
  value: string;
  numericValue: number | null;
  unit: string;
  observedAt: string;
  latitude: number | null;
  longitude: number | null;
};

export type CsvImportResult = {
  observations: WaterObservation[];
  areas: string[];
  datedSamples: number;
  mappedSamples: number;
};

export class CsvImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvImportError";
  }
}

const AREA_HEADERS = ["area", "locality", "ward", "location", "district", "zone", "site", "station", "place"];
const MEASURE_HEADERS = ["parameter", "indicator", "measurement", "metric", "test", "pollutant", "analyte"];
const VALUE_HEADERS = ["value", "result", "reading", "concentration", "level", "count"];
const UNIT_HEADERS = ["unit", "units"];
const DATE_HEADERS = ["date", "sample_date", "observed_at", "timestamp", "time", "collected_at"];
const LATITUDE_HEADERS = ["latitude", "lat"];
const LONGITUDE_HEADERS = ["longitude", "lon", "lng", "long"];

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function findHeader(headers: string[], aliases: string[]) {
  const normalizedAliases = new Set(aliases.map(normalizeHeader));
  return headers.find((header) => normalizedAliases.has(normalizeHeader(header)));
}

function cell(row: Record<string, string>, header?: string) {
  return header ? String(row[header] ?? "").trim() : "";
}

function numericValue(rawValue: string): number | null {
  const normalized = rawValue.replaceAll(",", "").trim();
  if (!normalized) return null;
  const match = normalized.match(/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

function coordinate(rawValue: string, min: number, max: number) {
  const value = numericValue(rawValue);
  return value !== null && value >= min && value <= max ? value : null;
}

export function parseWaterCsv(csvText: string): CsvImportResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    throw new CsvImportError("The CSV could not be read. Check its headings and row formatting, then try again.");
  }

  const sourceRows = parsed.data.filter((row) => Object.values(row).some((value) => String(value ?? "").trim()));
  const headers = parsed.meta.fields ?? [];
  const areaHeader = findHeader(headers, AREA_HEADERS);
  if (!areaHeader) {
    throw new CsvImportError("Add a column named area, locality, ward, location, or site so samples can be grouped.");
  }

  const measureHeader = findHeader(headers, MEASURE_HEADERS);
  const valueHeader = findHeader(headers, VALUE_HEADERS);
  const unitHeader = findHeader(headers, UNIT_HEADERS);
  const dateHeader = findHeader(headers, DATE_HEADERS);
  const latitudeHeader = findHeader(headers, LATITUDE_HEADERS);
  const longitudeHeader = findHeader(headers, LONGITUDE_HEADERS);
  const isLongFormat = Boolean(measureHeader && valueHeader);
  const reservedHeaders = new Set(
    [areaHeader, measureHeader, valueHeader, unitHeader, dateHeader, latitudeHeader, longitudeHeader]
      .filter((header): header is string => Boolean(header))
      .map(normalizeHeader),
  );
  const measurementHeaders = isLongFormat
    ? []
    : headers.filter((header) => !reservedHeaders.has(normalizeHeader(header)));

  if (!isLongFormat && measurementHeaders.length === 0) {
    throw new CsvImportError("Add a measurement column, or use parameter and value columns to describe each reading.");
  }

  const observations: WaterObservation[] = [];
  sourceRows.forEach((row, rowIndex) => {
    const area = cell(row, areaHeader);
    if (!area) return;
    const latitude = coordinate(cell(row, latitudeHeader), -90, 90);
    const longitude = coordinate(cell(row, longitudeHeader), -180, 180);
    const observedAt = cell(row, dateHeader);

    if (isLongFormat && measureHeader && valueHeader) {
      const value = cell(row, valueHeader);
      const measure = cell(row, measureHeader);
      if (value && measure) {
        observations.push({
          id: `row-${rowIndex + 2}`,
          area,
          measure,
          value,
          numericValue: numericValue(value),
          unit: cell(row, unitHeader),
          observedAt,
          latitude,
          longitude,
        });
      }
      return;
    }

    measurementHeaders.forEach((header) => {
      const value = cell(row, header);
      if (!value) return;
      observations.push({
        id: `row-${rowIndex + 2}-${normalizeHeader(header)}`,
        area,
        measure: header.replaceAll("_", " "),
        value,
        numericValue: numericValue(value),
        unit: "",
        observedAt,
        latitude,
        longitude,
      });
    });
  });

  if (observations.length === 0) {
    throw new CsvImportError("No readings were found. Check that each row has an area and at least one measurement.");
  }

  return {
    observations,
    areas: [...new Set(observations.map(({ area }) => area))],
    datedSamples: new Set(observations.map(({ observedAt }) => observedAt).filter(Boolean)).size,
    mappedSamples: observations.filter(({ latitude, longitude }) => latitude !== null && longitude !== null).length,
  };
}

export function isCholeraMeasure(measure: string) {
  return /cholera|vibrio|pathogen|microbial|e\.?\s*coli|fecal|faecal/i.test(measure);
}