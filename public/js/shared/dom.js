/**
 * DOM Utility Functions
 * Helper functions for DOM manipulation
 */

/**
 * Show an element
 * @param {HTMLElement} element - Element to show
 */
export function show(element) {
	if (element) {
		element.classList.remove('hidden');
	}
}

/**
 * Hide an element
 * @param {HTMLElement} element - Element to hide
 */
export function hide(element) {
	if (element) {
		element.classList.add('hidden');
	}
}

/**
 * Toggle element visibility
 * @param {HTMLElement} element - Element to toggle
 */
export function toggle(element) {
	if (element) {
		element.classList.toggle('hidden');
	}
}

/**
 * Add class to element
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class to add
 */
export function addClass(element, className) {
	if (element) {
		element.classList.add(className);
	}
}

/**
 * Remove class from element
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class to remove
 */
export function removeClass(element, className) {
	if (element) {
		element.classList.remove(className);
	}
}

/**
 * Toggle class on element
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class to toggle
 */
export function toggleClass(element, className) {
	if (element) {
		element.classList.toggle(className);
	}
}

/**
 * Set text content safely
 * @param {HTMLElement} element - Target element
 * @param {string} text - Text to set
 */
export function setText(element, text) {
	if (element) {
		element.textContent = text;
	}
}

/**
 * Set HTML content safely (use with caution)
 * @param {HTMLElement} element - Target element
 * @param {string} html - HTML to set
 */
export function setHtml(element, html) {
	if (element) {
		element.innerHTML = html;
	}
}

/**
 * Clear element content
 * @param {HTMLElement} element - Element to clear
 */
export function clearContent(element) {
	if (element) {
		element.innerHTML = '';
	}
}

/**
 * Enable an element
 * @param {HTMLElement} element - Element to enable
 */
export function enable(element) {
	if (element) {
		element.disabled = false;
	}
}

/**
 * Disable an element
 * @param {HTMLElement} element - Element to disable
 */
export function disable(element) {
	if (element) {
		element.disabled = true;
	}
}

/**
 * Get element by ID
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} Element or null
 */
export function getElementById(id) {
	return document.getElementById(id);
}

/**
 * Get elements by class name
 * @param {string} className - Class name
 * @returns {HTMLCollectionOf<Element>} Elements
 */
export function getElementsByClassName(className) {
	return document.getElementsByClassName(className);
}

/**
 * Query selector
 * @param {string} selector - CSS selector
 * @returns {Element|null} Element or null
 */
export function querySelector(selector) {
	return document.querySelector(selector);
}

/**
 * Query selector all
 * @param {string} selector - CSS selector
 * @returns {NodeListOf<Element>} NodeList
 */
export function querySelectorAll(selector) {
	return document.querySelectorAll(selector);
}

/**
 * Create element
 * @param {string} tagName - Tag name
 * @param {Object} attributes - Attributes to set
 * @param {string} content - Text content
 * @returns {HTMLElement} Created element
 */
export function createElement(tagName, attributes = {}, content = '') {
	const element = document.createElement(tagName);
	
	// Set attributes
	Object.keys(attributes).forEach(key => {
		if (key === 'className') {
			element.className = attributes[key];
		} else if (key === 'innerHTML') {
			element.innerHTML = attributes[key];
		} else {
			element.setAttribute(key, attributes[key]);
		}
	});
	
	// Set content
	if (content) {
		element.textContent = content;
	}
	
	return element;
}

/**
 * Append child element
 * @param {HTMLElement} parent - Parent element
 * @param {HTMLElement} child - Child element
 */
export function appendChild(parent, child) {
	if (parent && child) {
		parent.appendChild(child);
	}
}

/**
 * Remove child element
 * @param {HTMLElement} parent - Parent element
 * @param {HTMLElement} child - Child element
 */
export function removeChild(parent, child) {
	if (parent && child) {
		parent.removeChild(child);
	}
}
