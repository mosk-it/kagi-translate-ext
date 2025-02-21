import re
import json
import urllib.request
from urllib.parse import urlparse
from os import path
import shutil

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

                languages.append({"iso": iso, "lang": lang, "hide": True})

    return languages

def process_language_visibility(languages, visible_isos):
    for item in languages:
        if item["iso"] in visible_isos:
            item["hide"] = False
    return languages


def save_languages_to_json(languages, filename):
    with open(filename, 'w') as f:
        json.dump(languages, f, indent=2)


def backup_file(file_path: str):
    base_name = path.basename(source_file)
    backup_file_name = f"{path.splitext(base_name)[0]}_{timestamp}{path.splitext(base_name)[1]}"
    backup_file_path = path.join(backup_dir, backup_file_name)

    # Copy the source file to the backup location
    shutil.copy2(source_file, backup_file_path)
    print(backup_file_name)

def merge_languages_with_file(new_languages: list, dest_file, output_file, backup=True):
    """so, dest_file will be merged with newly found languages
    old languages (even those that don't exist on kagi translate site)
    won't be removed, I found kagi handles it well
    """

    try:
        with open(dest_file, 'r') as f:
            current_languages = json.load(f)
    except FileNotFoundError:
        current_languages = []


    # Convert back to list
    if backup:
        backup_file(dest_file)

    # new langs
    new_lang_dict = {lang["iso"]: lang for lang in new_languages}

    # merge new new_languages, replacing duplicates
    for item in current_languages:
        iso = item["iso"]
        g = item["lang"]

        if iso not in lang_dict:
            current_languages[iso] = item
        elif lang_dict[iso] != g:
            current_languages[iso] = item

    merged_languages = list(lang_dict.values())

    # Save merged result
    with open(output_file, 'w') as f:
        json.dump(merged_languages, f, indent=2)

    return merged_languages

def main(target_url):

    # the most commonly used languages in the world - ethnologue 2017
    visible_isos = [
        'zh', 'wuu', 'yue', 'es', 'en', 'ar', 'hi', 'bn', 'pt', 'ru', 'ja',
        'lah', 'pnb', 'jv', 'ko', 'de', 'fr', 'te', 'mr', 'tr', 'ur', 'vi',
        'ta', 'it', 'fa', 'ms'
    ]

    html = download_html(target_url)
    if not html:
        return

    languages = extract_languages(html)
    languages = process_language_visibility(languages, visible_isos)

    save_languages_to_json(languages, 'languages.json')


    # TEST
    # languages = [
    #     { "lang": "Pashto", "iso": "PS" },
    #     { "lang": "Persian", "iso": "FA" },
    #     { "lang": "Pirate Speak", "iso": None },
    #     { "lang": "Polish", "iso": "PL" },
    # ]


    merge_languages_with_file(languages, dest_file='../src/languages.json', output_file='../src/languages.json', backup=True)

    print(f"processed {len(languages)} languages")
    print(f"found {sum(1 for lang in languages if not lang['hide'])} visible languages")

if __name__ == "__main__":
    import sys
    target_url = sys.argv[1] if len(sys.argv) > 1 else 'https://translate.kagi.com/'
    main(target_url)
