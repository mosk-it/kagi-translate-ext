#!/usr/bin/env bash

URL="https://translate.kagi.com/"

curl "$URL" |\
    grep -o '"languages\.[^"]*":{text:"[^"]*",translationContext:"[^"]*"' |\
    sed -E 's/"languages\.([^"]*)":\{text:"([^"]*)",translationContext:"([^"]*)"/ISO: \1 | Text: \2 | Context: \3/'
