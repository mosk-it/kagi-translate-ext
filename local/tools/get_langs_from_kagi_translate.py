import re
import json
import urllib.request
from urllib.parse import urlparse
from os import makedirs
from sys import argv


import shutil

from datetime import datetime
from os.path import join as j
from os.path import dirname, abspath, basename

TOOLS_DIR = dirname(abspath(__file__))
LANG_BACKUP_DIR = j(TOOLS_DIR, "../backup/")
SRC_DIR = j(TOOLS_DIR, "../../src/")

makedirs(LANG_BACKUP_DIR, exist_ok=True)


# the most commonly used languages (MCUL) in the world - ethnologue 2017 - ISO3166
# will be used to determine which langs should be visible at the options page
# (the rest will show up after clicking "all langs" button)
MCUL_ISO = [
    'zh', 'wuu', 'yue', 'es', 'en', 'ar', 'hi', 'bn', 'pt', 'ru', 'ja',
    'lah', 'pnb', 'jv', 'ko', 'de', 'fr', 'te', 'mr', 'tr', 'ur', 'vi',
    'ta', 'it', 'fa', 'ms'
]


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
    input_regex = re.compile(r'<input\s+type="radio"\s+value="([^"]+)"\s+name="from"[^>]*>')

    for match in input_regex.finditer(html):
        iso = match.group(1)
        if iso == 'auto':
            continue

        # Find parent label
        label_start = html.rfind('<label', 0, match.start())
        label_end = html.find('</label>', match.end()) + 8

        if label_start != -1 and label_end != -1:
            label_html = html[label_start:label_end]

            # Find p tag
            p_start = label_html.find('<p')
            p_end = label_html.find('</p>') + 4

            if p_start != -1 and p_end != -1:
                p_html = label_html[p_start:p_end]
                lang = get_text_content(p_html)

                languages.append({"iso": iso, "lang": lang})

    return languages

def process_language_visibility(languages: list):

    for k,v in enumerate(languages):
        if v['iso'].lower() in MCUL_ISO:
            languages[k]["m"] = True
    return languages


def save_languages_to_json(languages: list, filename: str):
    with open(filename, 'w') as f:
        f.write('[' + '\n')

        for i, lang in enumerate(languages):
            json_string = json.dumps(lang)
            f.write('  ' + json_string)

            if len(languages)-1 != i:
                f.write(',\n')
            else:
                f.write('\n')


        f.write(']' + '\n')


def backup_file(file_path: str):

    ymd = datetime.now().strftime('%Y%m%d')

    backup_file_name = '{}-{}'.format(basename(file_path), ymd)
    backup_file_path = j(LANG_BACKUP_DIR, backup_file_name)
    print('backing up file: ', backup_file_path)

    # Copy source file to the backup location
    shutil.copy2(file_path, backup_file_path)

def merge_languages_with_file(new_languages: list, previous_langs_file, backup=True):
    """so, previous_langs_file will be merged with newly found languages,
    old languages (even those that don't exist on kagi translate site anymore)
    won't be removed, I found kagi handles it well
    """

    try:
        with open(previous_langs_file, 'r') as f:
            current_languages = json.load(f)
    except FileNotFoundError:
        current_languages = []


    if backup:
        backup_file(previous_langs_file)

    new_lang_dict = {}

    for lang in current_languages:
        if lang["iso"]:

            # keep order {lang, iso}
            item = {
                'lang': lang['lang'],
                'iso': lang['iso']
            }

            new_lang_dict[lang["iso"]] = item

    for lang in new_languages:
        new_lang_dict[lang["iso"]] = {'lang': lang['lang'], 'iso': lang['iso']}

    merged_languages = list(new_lang_dict.values())

    # # Save merged result
    # with open(output_file, 'w') as f:
    #     json.dump(merged_languages, f, indent=2)

    return merged_languages

def main(target_url):


    html = download_html(target_url)
    if not html:
        return

    languages = extract_languages(html)


    # TESTS
    # languages = [
    #     [ "lang": "Pashto", "iso": "PS" ],
    #     { "lang": "Persian", "iso": "FA" },
    #     { "lang": "Pirate Speak", "iso": None },
    #     { "lang": "Polish", "iso": "PL" },
    # ]


    merged_langs = merge_languages_with_file(languages, j(SRC_DIR, 'languages.json'), backup=True)
    save_languages_to_json(process_language_visibility(merged_langs), j(SRC_DIR, 'languages.json'))

    print(f"processed {len(languages)} languages")
    print(f"found {sum(1 for lang in languages if 'm' in lang )} visible languages")

if __name__ == "__main__":
    import sys
    target_url = argv[1] if len(argv) > 1 else 'https://translate.kagi.com/'
    main(target_url)
