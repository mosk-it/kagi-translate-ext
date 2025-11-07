export class TranslateAPI {
    protected model: string = "standard";

    protected addresseeGender: string = 'unknown';
    protected formality: string = 'default';
    protected translationStyle: string = 'natural';


    constructor() { }

    private getAPIHeaders(): Record<string, string> {
        return {
            Accept: '*/*',
            'Accept-Language': 'en-US,en;q=0.5',
            'Content-Type': 'application/json',
            'X-Signal': 'abortable',
            Pragma: 'no-cache',
            'Cache-Control': 'no-cache',
            Priority: 'u=4'
        };
    }

    private async _makeRequest(
        endpoint: string,
        body: Record<string, any>
    ) {

        const response = await fetch(`https://translate.kagi.com/api${endpoint}`, {
            credentials: 'include',
            headers: this.getAPIHeaders(),
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        }

        return response;
    }

    public async detectLang(text: string) {
        const response = await this._makeRequest('/detect', { text: text });
        if (response.ok) {
            const data = await response.json();
            return data.language;
        }
    }

    private async* streamResponse(response: Response): AsyncGenerator<string, void, unknown> {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop()!;

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') return;
                    try {
                        const parsed = JSON.parse(data);
                        yield parsed.delta || '';
                    } catch { }
                }
            }
        }
    }

    /**
     * translates text from one language to another
     * 
     * @param text
     * @param fromLang
     * @param toLang
     * @param options
     *   - stream: if true - callback is used, and send stream=true in body to API
     *   - onUpdate: callback with each chunk when streaming is `stream` is true
     * @returns translated text
     */
    public async translate(
        text: string,
        fromLang: string,
        toLang: string,
        options: {
            stream?: boolean;
            onUpdate?: (chunk: string) => void;
        } = {}
    ) {
        const { stream = false, onUpdate } = options;

        try {

            let body = {
                from: fromLang,
                to: toLang,
                text: text.trim(),
                stream: stream,
                prediction: '',
                formality: this.formality,
                speaker_gender: 'unknown',
                addressee_gender: this.addresseeGender,
                translation_style: this.translationStyle,
                context: '',
                model: this.model,
                dictionary_language: 'en'
            }

            const response = await this._makeRequest('/translate', body)

            if (stream && onUpdate) {
                let fullText = '';
                for await (const chunk of this.streamResponse(response)) {
                    fullText += chunk;
                    onUpdate(chunk);
                }
                return fullText;
            } else {
                const data = await response.json();
                return data.text || data.translation || '';
            }
        } catch (e) {
            console.log('Error translating: ', e.message)
        }
    }
}
