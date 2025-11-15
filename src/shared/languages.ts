export interface LanguageInterface {
  lang: string;
  iso: string;
  m?: boolean; // is lang "common"?
}

export const commonLanguages: LanguageInterface[] = [
  {lang: "Arabic", iso: "ar"},
  {lang: "Bengali", iso: "bn"},
  {lang: "German", iso: "de"},
  {lang: "English", iso: "en"},
  {lang: "Spanish", iso: "es"},
  {lang: "Farsi", iso: "fa"},
  {lang: "French", iso: "fr"},
  {lang: "Hindi", iso: "hi"},
  {lang: "Italian", iso: "it"},
  {lang: "Japanese", iso: "ja"},
  {lang: "Javanese", iso: "jv"},
  {lang: "Korean", iso: "ko"},
  {lang: "Marathi", iso: "mr"},
  {lang: "Malay", iso: "ms"},
  {lang: "Portuguese", iso: "pt"},
  {lang: "Polish", iso: "pl"},
  {lang: "Russian", iso: "ru"},
  {lang: "Tamil", iso: "ta"},
  {lang: "Telugu", iso: "te"},
  {lang: "Turkish", iso: "tr"},
  {lang: "Urdu", iso: "ur"},
  {lang: "Vietnamese", iso: "vi"},
  {lang: "Chinese", iso: "zh"},
   {lang: "Cantonese", iso: "yue"},
]
