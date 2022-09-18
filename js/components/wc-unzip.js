import { Zip } from "../libs/zip.js";
import { GZip } from "../libs/gzip.js";
import { downloadBlob } from "../libs/utils.js";

export class WcUnzip extends HTMLElement {
	#zip;

	static get observedAttributes() {
		return [];
	}
	constructor() {
		super();
		this.bind(this);
	}
	bind(element) {
		element.attachEvents = element.attachEvents.bind(element);
		element.cacheDom = element.cacheDom.bind(element);
		element.onChange = element.onChange.bind(element);
		element.onDragLeave = element.onDragLeave.bind(element);
		element.onDragOver = element.onDragOver.bind(element);
		element.onDrop = element.onDrop.bind(element);
	}
	connectedCallback() {
		this.render();
		this.cacheDom();
		this.attachEvents();
	}
	render(){
		this.attachShadow({ mode: "open" });
		this.shadowRoot.innerHTML = `
			<style>
				:host { display: block; background: #999; min-inline-size: 320px; min-block-size: 240px; }
				:host(.over) {
					border: 8px solid green;
				}
			</style>
			<input type="file" id="file" accept=".gz,.zip">
			<ul id="list"></ul>
		`
	}
	cacheDom() {
		this.dom = {
			list: this.shadowRoot.querySelector("#list"),
			file: this.shadowRoot.querySelector("#file")
		};
	}
	attachEvents() {
		this.addEventListener("dragover", this.onDragOver);
		this.addEventListener("dragleave", this.onDragLeave);
		this.addEventListener("drop", this.onDrop);
		this.dom.file.addEventListener("change", this.onChange);
	}
	onDragOver(e){
		e.preventDefault();
		this.classList.add("over");
	}
	onDragLeave(e){
		e.preventDefault();
		this.classList.remove("over");
	}
	onDrop(e){
		e.preventDefault();
		const file = e.dataTransfer.files[0];
		this.readFile(file);
	}
	onChange(e){
		e.preventDefault();
		const file = this.dom.file.files[0];
		this.readFile(file)
	}
	readFile(file){
		this.dom.list.innerHTML = "";

		if (file.type === "application/x-zip-compressed"){
			const reader = new FileReader();
			reader.onload = () => {
				this.#zip = new Zip(reader.result);
				this.#zip.entries.forEach(e => {
					const li = document.createElement("li");
					li.textContent = e.fileName;
					li.addEventListener("click", async () => {
						const blob = await e.extract();
						downloadBlob(blob, e.fileName);
					});
					this.dom.list.append(li);
				});
			}
			reader.readAsArrayBuffer(file);
		}

		if(file.type === "application/x-gzip"){
			const reader = new FileReader();
			reader.onload = () => {
				this.#zip = new GZip(reader.result);
				const li = document.createElement("li");
				li.textContent = file.name;
				li.addEventListener("click", async () => {
					const blob = await this.#zip.extract();
					downloadBlob(blob, this.#zip.fileName);
				});
				this.dom.list.append(li);
			}
			reader.readAsArrayBuffer(file);
		}

		this.classList.remove("over");
	}
	attributeChangedCallback(name, oldValue, newValue) {
		this[name] = newValue;
	}
}

customElements.define("wc-unzip", WcUnzip);
