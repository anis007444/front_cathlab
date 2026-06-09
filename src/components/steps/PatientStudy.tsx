import axios from "axios";
import { Search, AlertCircle, CheckCircle, X, Filter } from "lucide-react";
import { InterventionData, defaultInterventionData } from "@/types/intervention";

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

import { Alert, AlertDescription } from "@/components/ui/alert";

import { useState, useEffect } from "react";

import { toast } from "sonner";

import PatientProfileView from "./PatientProfileView";

interface Props {
  data: InterventionData;
  onChange: (data: Partial<InterventionData>) => void;
  onNextStep?: (step?: number) => void;
}

interface Study {
  studyInsta: string;

  patientId: string;
  patientName: string;

  patientBirthDate: string;
  patientSex: string;

  studyDate: string;
  studyDescr: string;
  studyModal: string;
}

const PatientStudy = ({ data, onChange, onNextStep }: Props) => {
  const [studies, setStudies] = useState<Study[]>([]);

  const [selectedStudy, setSelectedStudy] =
    useState<Study | null>(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] =
    useState<"table" | "profile">("table");

  // Date filter with presets
  type DateFilterType = "all" | "today" | "week" | "month" | "year" | "range";
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Helper to calculate date ranges for presets
  const getDateRange = (type: DateFilterType) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (type) {
      case "today":
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case "week": {
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
        return { start, end };
      }
      case "month": {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return { start, end };
      }
      case "year": {
        const start = new Date(today.getFullYear(), 0, 1);
        const end = new Date(today.getFullYear() + 1, 0, 1);
        return { start, end };
      }
      case "range":
        return startDate && endDate
          ? { start: new Date(startDate), end: new Date(endDate) }
          : { start: null, end: null };
      default:
        return { start: null, end: null };
    }
  };

  // 🔹 FETCH STUDIES (support server-side pagination if available)
  const [totalItems, setTotalItems] = useState(0);
  const [serverPaged, setServerPaged] = useState(false);

  // pagination + optional study date filter
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const toBackendDate = (date: string) => {
    if (!date) return undefined;
    return date.replace(/-/g, "");
  };

  const getFilterValue = () => {
    switch (dateFilterType) {
      case "today":
      case "week":
        return dateFilterType;
      case "month": {
        const now = new Date();
        return `month:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      }
      case "year": {
        const now = new Date();
        return `year:${now.getFullYear()}`;
      }
      case "range": {
        if (!startDate || !endDate) return undefined;
        const start = toBackendDate(startDate);
        const end = toBackendDate(endDate);
        return start && end ? `range:${start}-${end}` : undefined;
      }
      default:
        return undefined;
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const mapRaw = (arr: any[]) =>
      arr
        .map((item) => ({
          studyInsta: item.studyInsta ?? "",

          patientId: item.patientId ?? "",
          patientName: item.patientNam ?? "",

          patientBirthDate: item.patientBir ?? "",

          patientSex: item.patientSex ?? "",

          studyDate: item.studyDate ?? "",

          studyDescr: item.studyDescr ?? "",

          studyModal: item.studyModal ?? "",
        }))
        .filter((s) => s.studyInsta && s.patientId && s.patientName);

    const fetchStudies = async () => {
      try {
        setLoading(true);
        setError(null);

        const filterValue = getFilterValue();

        const params: any = {
          PageNumber: pageNumber,
          PageSize: pageSize,
          ...(filterValue ? { Filter: filterValue } : {}),
        };

        const response = await axios.get(
          "http://localhost:5106/api/DicomStudy",
          {
            signal: controller.signal,
            params,
          }
        );

        // If API returns a simple array, assume it is already server-filtered/paged
        if (Array.isArray(response.data)) {
          const loaded = mapRaw(response.data);
          setServerPaged(true);
          setStudies(loaded);
          setTotalItems(loaded.length);
        } else if (response.data && Array.isArray(response.data.items)) {
          // API returns { items: [], totalCount }
          const loaded = mapRaw(response.data.items);
          setServerPaged(true);
          setStudies(loaded);
          const headerTotal = Number(response.headers["x-total-count"] ?? NaN);
          setTotalItems(response.data.totalCount ?? (Number.isFinite(headerTotal) ? headerTotal : loaded.length));
        } else {
          // unknown shape -> try to map as array-like
          const maybeArray = Array.isArray(response.data?.items)
            ? response.data.items
            : Array.isArray(response.data?.results)
            ? response.data.results
            : [];
          const loaded = mapRaw(maybeArray);
          setServerPaged(false);
          setStudies(loaded);
          setTotalItems(loaded.length);
        }

        setSelectedStudy(null);
      } catch (err) {
        if (!axios.isCancel(err)) {
          setError("Impossible de charger les studies.");
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStudies();

    return () => controller.abort();
  }, [pageNumber, pageSize, dateFilterType, startDate, endDate]);

  // (pagination state moved above)

  // 🔹 SEARCH + PAGINATION (client fallback when server doesn't page)
  let filteredStudies: Study[] = [];
  let paginatedStudies: Study[] = [];
  let totalPages = 1;

  // Helper function to filter by date range (server-side now, but kept for client-side fallback)
  const isInDateRange = (studyDate: string) => {
    // Date filtering is now handled server-side
    // This is kept only as a fallback for client-side filtering if needed
    return true;
  };

  if (serverPaged) {
    // server already returned the current page with date filtering applied
    // still apply client-side name/id filtering on the returned page
    const q = searchTerm.trim().toLowerCase();
    filteredStudies = studies.filter((s) => {
      const matchesSearch = !q || 
        s.patientName.toLowerCase().includes(q) ||
        s.patientId.toLowerCase().includes(q);
      
      return matchesSearch;
    });

    // when server-paged we display the returned page (possibly filtered),
    // and keep totalPages based on server totalItems so pagination UI stays
    // consistent.
    paginatedStudies = filteredStudies;
    totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  } else {
    filteredStudies = studies.filter((s) => {
      const matchesSearch = s.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.patientId.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });

    totalPages = Math.max(1, Math.ceil(filteredStudies.length / pageSize));
    paginatedStudies = filteredStudies.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
  }

  const goToPage = (p: number) => setPageNumber(Math.min(Math.max(1, p), totalPages));

  return (
    <div className="animate-fade-in space-y-6">

      {/* 🔵 ALERT AUCUNE STUDY */}
      {!selectedStudy && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />

          <AlertDescription className="text-blue-800">
            Veuillez sélectionner une study
            pour continuer
          </AlertDescription>
        </Alert>
      )}

      {/* 🟢 ALERT STUDY SELECTIONNÉE */}
      {selectedStudy && viewMode === "table" && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />

          <AlertDescription className="text-green-800">
            Study sélectionnée :
            <span className="font-semibold">
              {" "}
              {selectedStudy.patientName}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* 🔵 TABLE VIEW */}
      {viewMode === "table" && (
        <>
          <h2 className="text-xl font-semibold text-foreground">
            Sélection de la Study
          </h2>

          {error && (
            <p className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="clinical-card">

            {/* SEARCH */}
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Search
                  size={16}
                  className="text-muted-foreground"
                />

                <input
                  type="text"
                  placeholder="Rechercher un patient..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPageNumber(1);
                  }}
                  className="flex-1 bg-transparent text-sm outline-none"
                />

                {/* Filter button */}
                <div className="relative">
                  <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`p-2 rounded-md transition-colors ${
                      isFilterOpen
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                    title="Filtre de date"
                  >
                    <Filter size={18} />
                  </button>

                  {/* Filter dropdown */}
                  {isFilterOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-lg p-4 z-50">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-sm">Filtre de date</h3>
                          <button
                            onClick={() => setIsFilterOpen(false)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        {/* Quick filter buttons */}
                        <div className="flex flex-wrap gap-2">
                          {[
                            { key: "all" as DateFilterType, label: "Tout" },
                            { key: "today" as DateFilterType, label: "Aujourd'hui" },
                            { key: "week" as DateFilterType, label: "Cette semaine" },
                            { key: "month" as DateFilterType, label: "Ce mois" },
                            { key: "year" as DateFilterType, label: "Cette année" },
                            { key: "range" as DateFilterType, label: "Personnalisé" },
                          ].map(({ key, label }) => (
                            <button
                              key={key}
                              onClick={() => {
                                setDateFilterType(key);
                                setPageNumber(1);
                              }}
                              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                dateFilterType === key
                                  ? "bg-primary text-primary-foreground"
                                  : "border border-border bg-background hover:bg-muted"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        {/* Custom date range inputs - only shown when "range" is selected */}
                        {dateFilterType === "range" && (
                          <div className="flex flex-col gap-2 p-3 rounded-md border border-border bg-muted/30">
                            <label className="text-sm text-muted-foreground">
                              Du :
                            </label>
                            <input
                              type="date"
                              value={startDate}
                              onChange={(e) => {
                                setStartDate(e.target.value);
                                setPageNumber(1);
                              }}
                              className="text-sm bg-background border border-border rounded px-2 py-1"
                            />
                            <label className="text-sm text-muted-foreground">
                              Au :
                            </label>
                            <input
                              type="date"
                              value={endDate}
                              onChange={(e) => {
                                setEndDate(e.target.value);
                                setPageNumber(1);
                              }}
                              className="text-sm bg-background border border-border rounded px-2 py-1"
                            />
                            {(startDate || endDate) && (
                              <button
                                onClick={() => {
                                  setStartDate("");
                                  setEndDate("");
                                  setPageNumber(1);
                                }}
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1"
                              >
                                <X size={14} /> Réinitialiser
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* LOADING */}
            {loading ? (
              <p className="text-center text-muted-foreground py-6">
                Chargement des studies...
              </p>
            ) : (
              <>
              <div className="rounded-md border overflow-hidden">

                <Table>
                  <TableHeader>
                    <TableRow>

                      <TableHead>
                        Patient ID
                      </TableHead>

                      <TableHead>
                        Nom
                      </TableHead>

                      <TableHead className="hidden sm:table-cell">
                        Date naissance
                      </TableHead>

                      <TableHead className="hidden sm:table-cell">
                        Sexe
                      </TableHead>

                      <TableHead className="hidden md:table-cell">
                        Date Study
                      </TableHead>

                      <TableHead className="hidden md:table-cell">
                        Modalité
                      </TableHead>

                      <TableHead className="hidden lg:table-cell">
                        Description
                      </TableHead>

                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {paginatedStudies.map((study) => (
                      <TableRow
                        key={study.studyInsta}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {

                          setSelectedStudy(study);

                          setViewMode("profile");

                          onChange?.({
                            ...defaultInterventionData,
                            patientId: study.patientId,
                            patientName: study.patientName,
                            patientDOB: study.patientBirthDate,
                            patientSex: study.patientSex,
                            studyInstanceUID: study.studyInsta,
                            studyInsta: study.studyInsta,
                          });

                          toast.success(
                            `Study sélectionnée : ${study.patientName}`
                          );
                        }}
                      >

                        <TableCell>
                          {study.patientId}
                        </TableCell>

                        <TableCell>
                          {study.patientName}
                        </TableCell>

                        <TableCell className="hidden sm:table-cell">
                          {study.patientBirthDate}
                        </TableCell>

                        <TableCell className="hidden sm:table-cell">
                          {study.patientSex}
                        </TableCell>

                        <TableCell className="hidden md:table-cell">
                          {study.studyDate}
                        </TableCell>

                        <TableCell className="hidden md:table-cell">
                          {study.studyModal}
                        </TableCell>

                        <TableCell className="hidden lg:table-cell">
                          {study.studyDescr}
                        </TableCell>

                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredStudies.length > 0 && (
                <div className="flex items-center justify-between mt-3 gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-sm"
                      onClick={() => goToPage(pageNumber - 1)}
                      disabled={pageNumber === 1}
                    >
                      Préc
                    </button>

                    <span className="text-sm text-muted-foreground">
                      Page {pageNumber} / {totalPages}
                    </span>

                    <button
                      className="btn btn-sm"
                      onClick={() => goToPage(pageNumber + 1)}
                      disabled={pageNumber === totalPages}
                    >
                      Suiv
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Lignes:</label>
                    <select
                      className="rounded-md border bg-transparent text-sm px-2 py-1"
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
              )}
            </>
            )}

            {/* EMPTY */}
            {!loading &&
              filteredStudies.length === 0 && (
                <p className="text-center text-muted-foreground py-6">
                  Aucune study trouvée
                </p>
              )}
          </div>
        </>
      )}

      {/* 🟢 PROFILE VIEW */}
      {viewMode === "profile" &&
        selectedStudy && (
          <PatientProfileView
            patient={{
              id: selectedStudy.patientId,
              name: selectedStudy.patientName,
              dob: selectedStudy.patientBirthDate,
              sex: selectedStudy.patientSex,
            }}
            onBack={() =>
              setViewMode("table")
            }
            onInterventionLoaded={(mappedData, targetStep) => {
              onChange?.(mappedData);
              if (onNextStep) {
                onNextStep(targetStep);
              }
            }}
          />
        )}
    </div>
  );
};

export default PatientStudy;