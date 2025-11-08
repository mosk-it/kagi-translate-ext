import re
import json
import urllib.request
from urllib.parse import urlparse
from os import makedirs
from sys import argv
import shutil
from datetime import datetime
from os.path import join as j
from os.path import dirname, abspath, basename, isfile

TOOLS_DIR = dirname(abspath(__file__))
LANG_BACKUP_DIR = j(TOOLS_DIR, "../backup/")
SRC_DIR = j(TOOLS_DIR, "../../src/")
LANG_OUTPUT_PATH = j(SRC_DIR, 'shared', 'languages.json')

makedirs(LANG_BACKUP_DIR, exist_ok=True)


# the most commonly used languages (MCUL) in the world - ethnologue 2017 - ISO3166
# will be used to determine which langs should be visible at the options page
# (the rest will show up after clicking "all langs" button)
MCUL_ISO = {
    'zh', 'wuu', 'yue', 'es', 'en', 'ar', 'hi', 'bn', 'pt', 'ru', 'ja',
    'lah', 'pnb', 'jv', 'ko', 'de', 'fr', 'te', 'mr', 'tr', 'ur', 'vi',
    'ta', 'it', 'fa', 'ms'
}

# ignore undetermined proofread
IGNORED_ISO = {'und', 'proofread'}

def download_html(target_url):
    try:
        with urllib.request.urlopen(target_url) as response:
            return response.read().decode('utf-8')
    except Exception as e:
        print(f"Error downloading HTML: {str(e)}")
        return None

def get_text_content(html):
    return re.sub(r'<[^>]+>', '', html).strip()

def extract_languages(html):
    languages = []
    pattern = re.compile(r'"languages\.([^"]+)":\{text:"([^"]*)",translationContext:"[^"]*"')

    for match in pattern.finditer(html):
        iso = match.group(1)
        lang = match.group(2)
        if iso in IGNORED_ISO:
            continue

        languages.append({"lang": lang, "iso": iso})

    return languages

def process_language_visibility(languages: list):
    for lang in languages:
        if lang['iso'].lower() in MCUL_ISO:
            lang["m"] = True
    return languages

def save_languages_to_json(languages: list, filename: str):
    makedirs(dirname(filename), exist_ok=True)
    with open(filename, 'w') as f:
        f.write('[\n')
        for i, lang in enumerate(languages):
            json_string = json.dumps(lang)
            f.write('  ' + json_string)
            if i < len(languages) - 1:
                f.write(',\n')
            else:
                f.write('\n')
        f.write(']\n')

def backup_file(file_path: str):
    if not isfile(file_path):
        return  # No file to back up

    ymd = datetime.now().strftime('%Y%m%d')
    backup_file_name = '{}-{}'.format(basename(file_path), ymd)
    backup_file_path = j(LANG_BACKUP_DIR, backup_file_name)
    print('backing up file:', backup_file_path)
    shutil.copy2(file_path, backup_file_path)

def main(target_url):
    html = download_html(target_url)
    if not html:
        return

    languages = extract_languages(html)
    final_langs = process_language_visibility(languages)

    # Backup old file if exists
    backup_file(LANG_OUTPUT_PATH)

    # Save new file
    save_languages_to_json(final_langs, LANG_OUTPUT_PATH)

    print(f"processed {len(languages)} languages and saved to {LANG_OUTPUT_PATH}")
    visible_count = sum(1 for lang in final_langs if 'm' in lang)
    print(f"found {visible_count} visible languages")

if __name__ == "__main__":
    target_url = argv[1] if len(argv) > 1 else 'https://translate.kagi.com/'
    main(target_url)
