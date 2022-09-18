import { bufferToStream, streamToBlob, readString } from "./utils.js";

export class Zip {
	#dataView;
	#index = 0;
	#localFiles = [];
	#centralDirectories = [];
	#endOfCentralDirectory;

	constructor(arrayBuffer){
		this.#dataView = new DataView(arrayBuffer);
		this.read();
	}
	async extract(entry) {
		const buffer = this.#dataView.buffer.slice(entry.startsAt, entry.startsAt + entry.compressedSize);

		if(entry.compressionMethod === 0x00){
			return new Blob([buffer]);
		} else if(entry.compressionMethod === 0x08) {
			const decompressionStream = new DecompressionStream("deflate-raw");
			const stream = bufferToStream(buffer);
			const readable = stream.pipeThrough(decompressionStream);
			return await streamToBlob(readable);
		}
	}
	read(){
		while(!this.#endOfCentralDirectory){
			const signature = this.#dataView.getUint32(this.#index, true);
			if (signature === 0x04034b50){ //local file
				const entry = this.readLocalFile(this.#index);
				entry.startsAt = this.#index + 30 + entry.fileNameLength + entry.extraLength;
				entry.extract = this.extract.bind(this, entry);
				this.#localFiles.push(entry);
				this.#index += entry.startsAt + entry.compressedSize;
			} else if (signature === 0x02014b50){ //central directory
				const entry = this.readCentralDirectory(this.#index);
				this.#centralDirectories.push(entry);
				this.#index += 46 + entry.fileNameLength + entry.extraLength + entry.fileCommentLength;
			} else if (signature === 0x06054b50) { //end of central directory
				this.#endOfCentralDirectory = this.readEndCentralDirectory(this.#index);
			} 
		}
	}
	readLocalFile(offset){
		const fileNameLength = this.#dataView.getUint16(offset + 26, true);
		const extraLength = this.#dataView.getUint16(offset + 28, true);

		const entry = {
			signature: readString(this.#dataView, offset, 4),
			version: this.#dataView.getUint16(offset + 4, true),
			generalPurpose: this.#dataView.getUint16(offset + 6, true),
			compressionMethod: this.#dataView.getUint16(offset + 8, true),
			lastModifiedTime: this.#dataView.getUint16(offset + 10, true),
			lastModifiedDate: this.#dataView.getUint16(offset + 12, true),
			crc: this.#dataView.getUint32(offset + 14, true),
			compressedSize: this.#dataView.getUint32(offset + 18, true),
			uncompressedSize: this.#dataView.getUint32(offset + 22, true),
			fileNameLength,
			fileName: readString(this.#dataView, offset + 30, fileNameLength),
			extraLength,
			extra: readString(this.#dataView, offset + 30 + fileNameLength, extraLength),
		}

		return entry;
	}
	readCentralDirectory(offset) {
		const fileNameLength = this.#dataView.getUint16(offset + 28, true);
		const extraLength = this.#dataView.getUint16(offset + 30, true);
		const fileCommentLength = this.#dataView.getUint16(offset + 32, true);

		const centralDirectory = {
			signature: readString(this.#dataView, offset, 4),
			versionCreated: this.#dataView.getUint16(offset + 4, true),
			versionNeeded: this.#dataView.getUint16(offset + 6, true),
			generalPurpose: this.#dataView.getUint16(offset + 8, true),
			compressionMethod: this.#dataView.getUint16(offset + 10, true),
			lastModifiedTime: this.#dataView.getUint16(offset + 12, true),
			lastModifiedDate: this.#dataView.getUint16(offset + 14, true),
			crc: this.#dataView.getUint32(offset + 16, true),
			compressedSize: this.#dataView.getUint32(offset + 20, true),
			uncompressedSize: this.#dataView.getUint32(offset + 24, true),
			fileNameLength,
			extraLength,
			fileCommentLength,
			diskNumber: this.#dataView.getUint16(offset + 34, true),
			internalAttributes: this.#dataView.getUint16(offset + 36, true),
			externalAttributes: this.#dataView.getUint32(offset + 38, true),
			offset: this.#dataView.getUint32(42, true),
			fileName: readString(this.#dataView, offset + 46, fileNameLength),
			extra: readString(this.#dataView, offset + 46 + fileNameLength, extraLength),
			comments: readString(this.#dataView, offset + 46 + fileNameLength + extraLength, fileCommentLength),
		}

		return centralDirectory;
	}
	readEndCentralDirectory(offset){
		const commentLength = this.#dataView.getUint16(offset + 20, true);

		const endOfDirectory = {
			signature: readString(this.#dataView, offset, 4),
			numberOfDisks: this.#dataView.getUint16(offset + 4, true),
			centralDirectoryStartDisk: this.#dataView.getUint16(offset + 6, true),
			numberCentralDirectoryRecordsOnThisDisk: this.#dataView.getUint16(offset + 8, true),
			numberCentralDirectoryRecords: this.#dataView.getUint16(offset + 10, true),
			centralDirectorySize: this.#dataView.getUint32(offset + 12, true),
			centralDirectoryOffset: this.#dataView.getUint32(offset + 16, true),
			commentLength: commentLength,
			comment: readString(this.#dataView, offset + 22, commentLength)
		};

		return endOfDirectory;
	}
	get entries(){
		return this.#localFiles;
	}
}