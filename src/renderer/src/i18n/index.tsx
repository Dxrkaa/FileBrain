import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "en" | "no";

const translations = {
  en: {
    // Layout
    nav_dashboard: "Dashboard",
    nav_files: "Files",
    nav_search: "Search",
    nav_graph: "Knowledge Graph",
    badge_local_ai: "Local AI",
    badge_on_device: "100% on-device",

    // Dashboard
    dash_title: "Knowledge Overview",
    dash_subtitle: "Your files, understood.",
    dash_stat_files: "Total Files",
    dash_stat_tags: "Tags Generated",
    dash_stat_connections: "Connections",
    dash_stat_storage: "Storage",
    dash_stat_processed: "processed",
    dash_stat_across: "across all files",
    dash_stat_relationships: "file relationships",
    dash_stat_total_size: "total file size",
    dash_recent: "Recent Files",
    dash_view_all: "View all",
    dash_upload_prompt: "Upload files",
    dash_upload_prompt_suffix: "to get started",
    dash_not_processed: "Not yet processed",
    dash_graph_title: "Knowledge Graph",
    dash_graph_expand: "Expand",
    dash_graph_upload_hint: "Upload files to see connections",
    dash_loading: "Loading...",
    dash_top_tags: "Top Tags",
    dash_process_tags_hint: "Process files to generate tags",

    // Files page
    files_title: "Files",
    files_subtitle_count: "files in your knowledge base",
    files_upload_btn: "Upload Files",
    files_drop_hint: "Drop files here or click to browse",
    files_drop_types: "PDF, text, code, images, spreadsheets — up to 50MB",
    files_filter_tag: "Filter by tag...",
    files_filter_all_types: "All types",
    files_filter_clear: "Clear",
    files_no_files: "No files found",
    files_process_ai: "Process with AI",
    files_processing: "Processing...",
    files_related: "related",

    // File type labels (dropdown)
    filetype_image: "Image",
    filetype_text: "Text",
    filetype_code: "Code",
    filetype_spreadsheet: "Spreadsheet",
    filetype_document: "Document",
    filetype_presentation: "Presentation",
    filetype_archive: "Archive",
    filetype_other: "Other",

    // File detail
    detail_process_ai: "Process with AI",
    detail_processing: "Processing... this may take a minute",
    detail_ai_summary: "AI Summary",
    detail_no_summary: "No summary yet.",
    detail_process_to_generate: "Process with AI to generate one.",
    detail_still_processing: "Processing...",
    detail_tags: "Tags",
    detail_key_topics: "Key Topics",
    detail_extracted: "Extracted Content",
    detail_file_info: "File Info",
    detail_related_files: "Related Files",
    detail_no_related_ready: "No related files found",
    detail_no_related_pending: "Process to find related files",
    detail_not_found: "File not found.",
    detail_back_to_files: "Back to Files",
    detail_type: "Type",
    detail_mime: "MIME",
    detail_size: "Size",
    detail_status: "Status",
    detail_connections: "connections",
    detail_open_file: "Open File",
    detail_open_file_error: "Could not open file. It may have been moved or deleted.",
    detail_selected: "Selected",

    // Search
    search_title: "Semantic Search",
    search_subtitle: "Find files by meaning, not just keywords",
    search_placeholder: 'Try "climate report with graphs" or "python data analysis"',
    search_try: "Try asking...",
    search_powered: "Powered by Ollama running locally — your queries never leave your computer. Files must be processed with AI first.",
    search_no_results: "No results for",
    search_results: "result",
    search_results_plural: "results",
    search_for: "for",
    search_generating: "Generating suggestions...",

    // Graph
    graph_title: "Knowledge Graph",
    graph_empty: "Knowledge graph is empty",
    graph_upload_btn: "Upload Files",
    graph_click_hint: "Click a node to see details",
    graph_pan_hint: "Drag to pan · Scroll to zoom",
    graph_legend: "Legend",
    graph_not_processed: "Not processed",
    graph_processed: "Processed (AI ready)",
    graph_more_connections: "More connections = larger",
    graph_selected: "Selected",
    graph_connections: "connections",
    graph_open_file: "Open File",

    // Setup
    setup_title: "Setting up FileBrain",
    setup_subtitle: "Getting everything ready — this only happens once",
    setup_done_title: "Ready!",
    setup_done_subtitle: "Launching your knowledge system...",
    setup_progress: "Setup progress",
    setup_step_check: "Checking for Ollama",
    setup_step_install: "Installing Ollama",
    setup_step_start: "Starting Ollama",
    setup_step_llama: "Downloading llama3.2 model",
    setup_step_nomic: "Downloading nomic-embed-text model",
    setup_retry: "Retry",
    setup_skip: "Skip",
    setup_privacy: "All AI processing runs locally on your computer.",
    setup_privacy2: "Your files never leave your device.",
    setup_already_installed: "Already installed",
    setup_already_running: "Already running",
    setup_already_downloaded: "Already downloaded",
    setup_waiting: "Waiting for Ollama to start...",
    setup_not_responding: "Ollama started but isn't responding. Please restart the app.",

    // Status badges
    status_ready: "Ready",
    status_processing: "Processing...",
    status_error: "Error",
    status_pending: "Pending",
  },
  no: {
    // Layout
    nav_dashboard: "Oversikt",
    nav_files: "Filer",
    nav_search: "Søk",
    nav_graph: "Kunnskapsgraf",
    badge_local_ai: "Lokal AI",
    badge_on_device: "100% lokalt",

    // Dashboard
    dash_title: "Kunnskapsoversikt",
    dash_subtitle: "Dine filer, forstått.",
    dash_stat_files: "Totale filer",
    dash_stat_tags: "Genererte tagger",
    dash_stat_connections: "Koblinger",
    dash_stat_storage: "Lagring",
    dash_stat_processed: "behandlet",
    dash_stat_across: "på tvers av alle filer",
    dash_stat_relationships: "filrelasjoner",
    dash_stat_total_size: "total filstørrelse",
    dash_recent: "Nylige filer",
    dash_view_all: "Se alle",
    dash_upload_prompt: "Last opp filer",
    dash_upload_prompt_suffix: "for å komme i gang",
    dash_not_processed: "Ikke behandlet ennå",
    dash_graph_title: "Kunnskapsgraf",
    dash_graph_expand: "Utvid",
    dash_graph_upload_hint: "Last opp filer for å se koblinger",
    dash_loading: "Laster...",
    dash_top_tags: "Toppkoder",
    dash_process_tags_hint: "Behandle filer for å generere koder",

    // Files page
    files_title: "Filer",
    files_subtitle_count: "filer i kunnskapsbasen",
    files_upload_btn: "Last opp filer",
    files_drop_hint: "Slipp filer her eller klikk for å bla",
    files_drop_types: "PDF, tekst, kode, bilder, regneark — opptil 50 MB",
    files_filter_tag: "Filtrer etter kode...",
    files_filter_all_types: "Alle typer",
    files_filter_clear: "Tøm",
    files_no_files: "Ingen filer funnet",
    files_process_ai: "Behandle med AI",
    files_processing: "Behandler...",
    files_related: "relaterte",

    // File type labels (dropdown)
    filetype_image: "Bilde",
    filetype_text: "Tekst",
    filetype_code: "Kode",
    filetype_spreadsheet: "Regneark",
    filetype_document: "Dokument",
    filetype_presentation: "Presentasjon",
    filetype_archive: "Arkiv",
    filetype_other: "Annet",

    // File detail
    detail_process_ai: "Behandle med AI",
    detail_processing: "Behandler... dette kan ta et minutt",
    detail_ai_summary: "AI-sammendrag",
    detail_no_summary: "Ingen sammendrag ennå.",
    detail_process_to_generate: "Behandle med AI for å generere ett.",
    detail_still_processing: "Behandler...",
    detail_tags: "Tagger",
    detail_key_topics: "Nøkkelemner",
    detail_extracted: "Uttrukket innhold",
    detail_file_info: "Filinformasjon",
    detail_related_files: "Relaterte filer",
    detail_no_related_ready: "Ingen relaterte filer funnet",
    detail_no_related_pending: "Behandle for å finne relaterte filer",
    detail_not_found: "Fil ikke funnet.",
    detail_back_to_files: "Tilbake til filer",
    detail_type: "Type",
    detail_mime: "MIME",
    detail_size: "Størrelse",
    detail_status: "Status",
    detail_connections: "koblinger",
    detail_open_file: "Åpne fil",
    detail_open_file_error: "Kunne ikke åpne filen. Den kan ha blitt flyttet eller slettet.",
    detail_selected: "Valgt",

    // Search
    search_title: "Semantisk søk",
    search_subtitle: "Finn filer etter mening, ikke bare nøkkelord",
    search_placeholder: 'Prøv "klimarapport med grafer" eller "python dataanalyse"',
    search_try: "Prøv å spørre...",
    search_powered: "Drevet av Ollama som kjører lokalt — søkene dine forlater aldri datamaskinen. Filer må behandles med AI først.",
    search_no_results: "Ingen resultater for",
    search_results: "resultat",
    search_results_plural: "resultater",
    search_for: "for",
    search_generating: "Genererer forslag...",

    // Graph
    graph_title: "Kunnskapsgraf",
    graph_empty: "Kunnskapsgrafen er tom",
    graph_upload_btn: "Last opp filer",
    graph_click_hint: "Klikk på en node for å se detaljer",
    graph_pan_hint: "Dra for å panorere · Rull for å zoome",
    graph_legend: "Forklaring",
    graph_not_processed: "Ikke behandlet",
    graph_processed: "Behandlet (AI klar)",
    graph_more_connections: "Flere koblinger = større",
    graph_selected: "Valgt",
    graph_connections: "koblinger",
    graph_open_file: "Åpne fil",

    // Setup
    setup_title: "Setter opp FileBrain",
    setup_subtitle: "Gjør alt klart — dette skjer bare én gang",
    setup_done_title: "Klar!",
    setup_done_subtitle: "Starter kunnskapssystemet...",
    setup_progress: "Oppsettsstatus",
    setup_step_check: "Søker etter Ollama",
    setup_step_install: "Installerer Ollama",
    setup_step_start: "Starter Ollama",
    setup_step_llama: "Laster ned llama3.2-modellen",
    setup_step_nomic: "Laster ned nomic-embed-text-modellen",
    setup_retry: "Prøv igjen",
    setup_skip: "Hopp over",
    setup_privacy: "All AI-behandling kjøres lokalt på datamaskinen din.",
    setup_privacy2: "Filene dine forlater aldri enheten din.",
    setup_already_installed: "Allerede installert",
    setup_already_running: "Kjører allerede",
    setup_already_downloaded: "Allerede lastet ned",
    setup_waiting: "Venter på at Ollama skal starte...",
    setup_not_responding: "Ollama startet, men svarer ikke. Start appen på nytt.",

    // Status badges
    status_ready: "Klar",
    status_processing: "Behandler...",
    status_error: "Feil",
    status_pending: "Venter",
  },
} as const;

type TranslationKey = keyof typeof translations.en;
type Translations = typeof translations.en;

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("filebrain-lang");
    return (saved === "no" ? "no" : "en") as Lang;
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("filebrain-lang", l);
  };

  const t = (key: TranslationKey): string => {
    const dict: Translations = translations[lang];
    return dict[key] ?? translations.en[key] ?? key;
  };

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useT() {
  return useContext(LangContext);
}
