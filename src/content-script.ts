let selectionTimeout: number | null = null;
let currentIcon: HTMLElement | null = null;

async function notifySelection(e: MouseEvent) {

	if (selectionTimeout) {
		clearTimeout(selectionTimeout);
	}

	try {
		const result = await browser.storage.local.get("openMinimalPopup");
		if (result.openMinimalPopup !== true) {
			return;
		}
	} catch (error) {
		console.error("Error accessing storage:", error);
		return;
	}
	// v run only if storage.local.openMinimalPopup 

	selectionTimeout = setTimeout(() => {

		const sel = window.getSelection();
		const selectedText = sel?.toString().trim() || '';

		if (sel && selectedText && sel.rangeCount > 0) {
			showIcon(sel, { selectedText: selectedText, x: e.clientX, y: e.clientY });
		}
	}, 300);
}

function createMinimalPopupContainer(offsetTop: number, offsetLeft: number, idx: string | null = null): HTMLDivElement {

	const popup = document.createElement('div');
	popup.className = 'text-popup-window';
	popup.innerHTML = `
		<div style="padding: 12px; font-family: sans-serif; font-size: 14px; max-width: 240px;">
			<div class="translation-text" id="${idx}" style="margin-bottom: 8px;"></div>
			<div style="color: #666;"></div>
		</div>
		`;

	popup.style.cssText = `
		top: ${offsetTop + 36}px;
		left: ${offsetLeft}px;
		position: absolute;
		background: #fff;
		border: 1px solid #ccc;
		border-radius: 4px;
		z-index: 10001;
		`;

	return popup;
}

function showIcon(selection: Selection, data: any) {
	cleanUp();

	const icon = document.createElement('div');

	icon.style.left = `${data.x}px`;
	icon.style.top = `${data.y}px`;
	icon.innerHTML = '💬';
	icon.className = 'bubble-icon-translate';

	const autoRemoveTimeout = setTimeout(() => {
		removeIcon();
	}, 2000);

	icon.addEventListener('click', (e) => {
		e.stopPropagation();

		clearTimeout(autoRemoveTimeout);
		const idx = 'tr-2137-' + Date.now();
		const popup = createMinimalPopupContainer(data.y + 10, data.x + 10, idx);
		document.body.appendChild(popup);

		browser.runtime.sendMessage({
			action: "translateText",
			txt: data.selectedText,
			elementId: idx,
		});

		removeIcon();

		const close = (event: MouseEvent) => {
			if (!popup.contains(event.target as Node)) {
				popup.remove();
				document.removeEventListener('click', close);
			}
		};

		// avoid immediate trigger
		setTimeout(() => {
			document.addEventListener('click', close);
		}, 0);
	});

	document.body.appendChild(icon);
	currentIcon = icon;
}



browser.runtime.onMessage.addListener((data) => {
	if (data.action === 'partialTranslation') {
		const el = document.getElementById(data.elementId);
		if (el) el.textContent += data.chunk;
	}
});

function removeIcon() {
	console.log('removeIcon')
	if (currentIcon) {
		currentIcon.remove();
		currentIcon = null;
	}
}
function cleanUp() {
	console.log('cleanUp')
	removeIcon();
	document.removeEventListener('click', close);
	document.querySelectorAll('.bubble-icon-translate').forEach(el => el.remove());
	document.querySelectorAll('.text-popup-window').forEach(el => el.remove());
}

document.addEventListener("mouseup", notifySelection);
