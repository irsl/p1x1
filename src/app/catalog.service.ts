import { Injectable } from '@angular/core';
import { S3Connection, S3Service, IS3, ListResult } from './s3';
import { CatalogPasswordBlock, Crypto, MasterKey, WrappedKey, EncryptedData, CatalogMasterKey, EncryptionDetails, MasterKeyAndPasswordBlock, CatalogWrappedMasterKey } from './crypto';
import { Helper } from './helper';
import PixiError, { E } from './error';
import { S3 } from 'aws-sdk';
import { IFilter, Filter } from './filter';
import { TagKeyValuePairs, TagNameContentPrefix, TagNameContentFilename, TagNameMediaWidth, TagNameMediaHeight, TagNameContentType, TagNameContentSize, TagNameHashPrefix, StringKeyValuePairs, TagNameMtimeDate, TagNameUploadDate, TagNameCreationDate, EventCallback, TagWeightPairs, EventSeverity, TagNameMediaDuration } from './catalog.common';
import { Base64 } from './base64';
import { HttpClientService } from './httpclient.service';

class SaveTransformationResult {
    public MainContent: ArrayBuffer;
    public encryptionDetails?: EncryptionDetails;

    public static fromJSON(data: any): SaveTransformationResult
    {
        data["MainContent"] = Base64.toArrayBuffer(data["MainContent"]);
        if(data["encryptionDetails"])
           data["encryptionDetails"] = EncryptionDetails.fromJSON(data["encryptionDetails"]);
        return Helper.create(SaveTransformationResult, data);
    }
    public toJSON(){
        var clone = Object.assign({}, this) as Object; // we need this as we will change the type to string
        clone["MainContent"] = Base64.toBase64String(clone["MainContent"]);
        return clone;   
    }
}

export const NameOfCombinedCatalogRoot = "Virtual catalog root";

export enum CatalogCapability { Writeable, CreateClearSubCatalog, CreatePasswordProtectedSubCatalog, CreateKeyDerivedSubCatalog, MountCatalog, ManagePasswords, ShareFilesClear, ShareFilesProtected };
interface S3PasswordCallback { (conn: S3Connection): Promise<string|MasterKey> }
interface SharedPasswordCallback { (url: string): Promise<string> }

const JsonContentType = "application/json";
export const CatalogFileExtension : string = ".catalog.json";
export const MainCatalogFilename : string = "index"+CatalogFileExtension;
const MainCatalogContentType : string = JsonContentType;

const HashesToCalculate = ["SHA-256"];

const OriginalFileVersionKey = "";
 
interface CatalogDictionary {
    [key: string]: ICatalog;
} 

interface FilesByHash {
    [key: string]: CatalogFile;
}
export interface SummarizedTags {
    [key: string]: Array<string|number>;
} 
export interface EncryptedVersionDetails {
    [key: string]: EncryptionDetails;
} 

export interface CatalogAndCatalogFile {
    catalog: ICatalog;
    file: CatalogFile;    
}

export class CatalogFileVersion {
    public versionName: string;
    public contentType: string;
    public encryptionDetails?: EncryptionDetails;
    public signedUrl?: string;

    public static fromJSON(data: any): CatalogFileVersion
    {
        if(data["encryptionDetails"])
           data["encryptionDetails"] = EncryptionDetails.fromJSON(data["encryptionDetails"]);
        return Helper.create(CatalogFileVersion, data);
    }
}
export interface CatalogFileVersionWithData extends CatalogFileVersion {
    data: ArrayBuffer;
}
export class CatalogFile {
    public versions: CatalogFileVersion[];
    public tags: TagKeyValuePairs;

    public toString(): string
    {
        return JSON.stringify(this.getContent());
    }

    public getContent()
    {
        return this.getTags(TagNameContentPrefix);
    }

    public static fromJSON(data: any): CatalogFile
    {
        if(data["versions"])
        {
            for(var i = 0; i < data["versions"].length; i++){
                data["versions"][i] = CatalogFileVersion.fromJSON(data["versions"][i]);
            }    
        }
        return Helper.create(CatalogFile, data);
    }

    public getFilename(): string
    {
        return this.tags[TagNameContentFilename].toString();
    }
    public setFilename(filename: string): void
    {
        this.tags[TagNameContentFilename] = filename;
    }
    public isImage(): boolean
    {
        return Helper.isImage(this.getContentType());
    }
    public isVideo(): boolean
    {
        return Helper.isVideo(this.getContentType());
    }
    public getWidth(): number {
        return CatalogFile.getAsNumber(this.tags[TagNameMediaWidth]) || -1;
    }
    public getHeight(): number {
        return CatalogFile.getAsNumber(this.tags[TagNameMediaHeight]) || -1;
    }
    public getContentType(): string
    {
        return this.tags[TagNameContentType].toString();
    }
    public setContentType(contentType: string): void
    {
        this.tags[TagNameContentType] = contentType;
    }
    private static getAsNumber(v: any): number {
        // this is just for an extra robustness as this crap language happily returns string here
        if(typeof v == "string")
           return parseInt(v, 10);

        return v as number;
    }
    public getDuration(): number
    {
        return CatalogFile.getAsNumber(this.tags[TagNameMediaDuration]);
    }
    public getContentSize(): number
    {
        return CatalogFile.getAsNumber(this.tags[TagNameContentSize]);
    }
    public setContentSize(size: number): void
    {
        this.tags[TagNameContentSize] = size;
    }
    public getSha256Hash(): string
    {
        return this.getHash("SHA-256");
    }
    public getHash(hashAlgo: string): string
    {
        return this.tags[TagNameHashPrefix+hashAlgo].toString();
    }
    public getHashes(): StringKeyValuePairs
    {
        return this.getTags(TagNameHashPrefix);
    }
    public setHash(hashAlgo: string, hashValue: string): void
    {
        this.tags[TagNameHashPrefix+hashAlgo] = hashValue;
    }
    public setHashes(hashes: StringKeyValuePairs): void
    {
        for(let q of Object.keys(hashes)) {
            this.setHash(q, hashes[q]);
        }
    }
    public initUploadDate() {
        this.setUploadDate(new Date());
    }
    public setMtimeDate(date: Date) {
        this.tags[TagNameMtimeDate] = date.toISOString();
    }
    public getMtimeDate(): Date {
        var v = this.tags[TagNameMtimeDate];
        if(!v) return null;
        return new Date(v.toString());
    }
    public setUploadDate(date: Date) {
        this.tags[TagNameUploadDate] = date.toISOString();
    }
    public getUploadDate(): Date {
        var v = this.tags[TagNameUploadDate];
        if(!v) return null;
        return new Date(v.toString());
    }
    public setCreationDate(date: Date) {
        this.tags[TagNameCreationDate] = date.toISOString();
    }
    public getCreationDate(): Date {
        var v = this.tags[TagNameCreationDate];
        if(!v) return null;
        return new Date(v.toString());
    }
    public getTagCount(): number
    {
        return Object.keys(this.getTags("")).length;
    }
    public getTags(prefix: string=null): StringKeyValuePairs
    {
        var re = {};
        for(var q of Object.keys(this.tags))
        {
            var n = q;
            if(prefix)
            {
                if (!q.startsWith(prefix)) continue;
                n = q.substr(prefix.length);
            }

            re[n] = this.tags[q].toString();
        }
        return re;
    }

    findCatalogFileVersion(versionName: string): CatalogFileVersion
    {
        for(let q of this.versions) {
            if(q.versionName == versionName) return q;
        }
        return null;
    }
    protected getFileVersionByName(version: string): CatalogFileVersion
    {
        for(let q of this.versions){
            if(q.versionName == version)
               return q;
        }
        return null;
    }

}
export class RawCatalogIndexBase {
}
export class RawCatalogIndexEncrypted extends RawCatalogIndexBase {
    passwordBlock: CatalogPasswordBlock;
    files: EncryptedData;

    public static fromJSON(data: any): RawCatalogIndexEncrypted
    {
        data["passwordBlock"] = CatalogPasswordBlock.fromJSON(data["passwordBlock"]);
        data["files"] = EncryptedData.fromJSON(data["files"]);
        return Helper.create(RawCatalogIndexEncrypted, data);
    }
}
export class CatalogFileArray extends Array<CatalogFile>
{
    public static fromJSON(data: any): CatalogFileArray
    {
        data = data.map(x => CatalogFile.fromJSON(x));
        return Helper.create(CatalogFileArray, data);
    }

}
export class RawCatalogIndexClear extends RawCatalogIndexBase {
    files: CatalogFileArray;

    public static fromJSON(data: any): RawCatalogIndexClear
    {        
        data["files"] = CatalogFileArray.fromJSON(data["files"]);
        return Helper.create(RawCatalogIndexClear, data);
    }
}
export class RawCatalog {
    public static fromJSON(data: any): RawCatalogIndexClear|RawCatalogIndexEncrypted
    {
        return data["passwordBlock"] ? RawCatalogIndexEncrypted.fromJSON(data) : RawCatalogIndexClear.fromJSON(data);
    }
}

export interface UploadFileDetails {
    originalData: ArrayBuffer;
    filename: string;
    mtime: Date,
    contentType: string;
    versions: CatalogFileVersionWithData[];
    tags: TagKeyValuePairs;
}
export interface IEntityWithName {
    getUniqueId(): string;
    getShortId(): string;
}
export interface IStats {
    AllFiles: number,
    AllTags: number,
    SumFileSize: number,
}
export interface ICatalog extends IEntityWithName {
    getSubCatalogs(): Array<ICatalog>;
    isWriteable(): boolean;
    getFiles(filter?: IFilter): Promise<CatalogAndCatalogFile[]>;
    getFilesRecursively(filter: IFilter): Promise<CatalogAndCatalogFile[]>;
    getFileByHash(hash: string): CatalogFile;
    getFileByName(name: string): CatalogFile;
    getTagStatistics(filter: StatisticsFilter): TagWeightPairs;
    getTagStatisticsRecursively(filter: StatisticsFilter): TagWeightPairs;
    getTagKeys(): Set<string>;
    getTagValues(tagKey: string): Set<string>;
    getTagKeysRecursively(): Set<string>;
    getTagValuesRecursively(tagKey: string): Set<string>;
    getSubCatalogsRecursively(): Array<ICatalog>;
    getWriteableSubcatalogsRecursively(): Array<ICatalog>;
    getCapabilities(): Set<CatalogCapability>;
    isCapable(cap: CatalogCapability): boolean;
    initializeTags();

    getStats(): IStats;
    getSubCatalogById(id: string);
    getSubCatalogByIdRecursively(id: string);

    setParent(parent: ICatalog);
    removeFile(file: CatalogFile, eventCallback: EventCallback): Promise<void>;
    uploadFile(file: UploadFileDetails, eventCallback: EventCallback): Promise<CatalogAndCatalogFile>;
    saveFileMeta(file: CatalogFile, eventCallback: EventCallback): Promise<void>;
    downloadFileVersion(file: CatalogFile, version: string): Promise<ArrayBuffer>;
    downloadOriginalFile(file: CatalogFile): Promise<ArrayBuffer>;
}
interface StatisticsFilter {
    tagPrefix?: string;
    aggregateValues?: boolean;
    hideProtectedTags?: boolean;
}
abstract class CatalogBase implements ICatalog {

    protected filesByHash: FilesByHash = {};
    protected filesByName: FilesByHash = {};

    protected tags: SummarizedTags = {};
    protected files: CatalogFileArray = [];
    protected subcatalogs: ICatalog[] = [];
    protected parent: ICatalog = null;

    abstract removeFile(file: CatalogFile, eventCallback: EventCallback): Promise<void>;
    abstract saveFileMeta(cf: CatalogFile, eventCallback: EventCallback): Promise<void>;
    abstract uploadFile(file: UploadFileDetails, eventCallback: EventCallback): Promise<CatalogAndCatalogFile>;
    abstract downloadFileVersion(file: CatalogFile, version: string): Promise<ArrayBuffer>;

    static findFileVersionOrThrow(file: CatalogFile, version: string): CatalogFileVersion
    {
        var cfv = file.findCatalogFileVersion(version);
        if(!cfv)
           throw new PixiError(E.InvalidFileVersion);
        return cfv;
    }

    public downloadOriginalFile(file: CatalogFile): Promise<ArrayBuffer> {
        return this.downloadFileVersion(file, OriginalFileVersionKey);
    }
    
    public getFileByHash(hash: string): CatalogFile
    {
        return this.filesByHash[hash];
    }

    public getFileByName(name: string): CatalogFile
    {
        return this.filesByName[name];
    }

    public getSubCatalogById(id: string) {
        for(let q of this.subcatalogs) {
            if(q.getUniqueId() == id)
               return q;
        }
        return null;
    }
    public getSubCatalogByIdRecursively(id: string) {
        var re = this.getSubCatalogById(id);
        if(re) return re;

        for(let q of this.subcatalogs) {
            if(id.startsWith(q.getUniqueId()))
            {
                re = q.getSubCatalogByIdRecursively(id);
                if(re != null) return re;
            }
        }
        return null;
    }

    public getTagStatistics(filter: StatisticsFilter = {}): TagWeightPairs
    {
        if(typeof(filter.aggregateValues) == "undefined")
           filter.aggregateValues = true;
        if(typeof(filter.hideProtectedTags) == "undefined")
           filter.hideProtectedTags = false;
        if(typeof(filter.tagPrefix) == "undefined")
           filter.tagPrefix = "";

        var re : TagWeightPairs = {};

        for(let q of this.files)
        {
            var tags = q.getTags(filter.tagPrefix);
            for(let tagKey of Object.keys(tags)){
                if((filter.hideProtectedTags)&&(Helper.isRestrictedTagNamespace(tagKey)))
                   continue;

                var tagValue = tags[tagKey];
                var finalKey = !filter.aggregateValues ? tagKey+(tagValue?"="+tagValue:"") : tagKey;
                if((filter.tagPrefix)&&(finalKey.startsWith('=')))
                   finalKey = finalKey.substr(1)
                if(!re[finalKey]) re[finalKey] = 0;
                re[finalKey]++;
            }
        }

        return re;
    }

    public getTagStatisticsRecursively(filter: StatisticsFilter = {}): TagWeightPairs
    {
        var re : TagWeightPairs = this.getTagStatistics(filter);

        for(let q of this.getSubCatalogs()) {
            var are = q.getTagStatisticsRecursively(filter);
            // console.log("subcatalog just returned tag:", q.getUniqueId(), are)
            for(let tagKey of Object.keys(are)){
                if(!re[tagKey]) re[tagKey] = 0;
                re[tagKey]+= are[tagKey];
            }
        }

        return re;
    }

    public getStats(): IStats
    {
        var sum = 0;
        this.files.map(x => sum += x.getContentSize());

        var allTags = 0;
        Object.keys(this.tags).map(x => allTags+= this.tags[x].length);

        return {
            AllTags: allTags,
            AllFiles: this.files.length,
            SumFileSize: sum,
        }
    }
    
    public setParent(parent: ICatalog)
    {
        this.parent = parent;
    }

    public getSubCatalogs(): Array<ICatalog>
    {
        return this.subcatalogs;
    }
    public isWriteable(): boolean
    {
        return this.isCapable(CatalogCapability.Writeable);
    }
    public isCapable(cap: CatalogCapability): boolean
    {
        return this.getCapabilities().has(cap);
    }

    public abstract getCapabilities(): Set<CatalogCapability>;

    public abstract getUniqueId(): string;
    public abstract getShortId(): string;
    public async getFiles(filter: IFilter = null): Promise<CatalogAndCatalogFile[]>
    {
        // using a dummy await to ensure a new thread is created to execute the rest of this function
        await new Promise((resolve)=>{resolve()});

        var cat = this as unknown as ICatalog; // crappy js cant see CatalogBase does implement ICatalog
        var re : CatalogAndCatalogFile[] = [];
        var catalog = this;
        this.files
          .filter(x => Filter.evaluate(filter, x, catalog))        
          .map(x => { 
              var a : CatalogAndCatalogFile = {
                catalog: cat, 
                file: x,
              };
              re.push(a);
          });
        return re;
    }
    public abstract getIsPasswordProtected(): boolean;

    public getTagKeys(): Set<string>
    {
        return new Set(Object.keys(this.tags));
    }
    public getTagValues(tagKey: string): Set<string>
    {
        var re = new Set<string>();
        Object.keys(this.tags).forEach(x =>{
            if(x == tagKey) {
                for(let q of this.tags[x])
                {
                    re.add(q.toString());
                }
            }
        })
        return re;
    }
    
    public getTagKeysRecursively(): Set<string>
    {
        return Helper.mergeSets(this.getTagKeys(), ...this.getSubCatalogs().map(x => x.getTagKeysRecursively()));
    }
    public getTagValuesRecursively(tagKey: string): Set<string>
    {
        return Helper.mergeSets(this.getTagKeys(), ...this.getSubCatalogs().map(x => x.getTagValuesRecursively(tagKey)));
    }

    public getSubCatalogsRecursively(): Array<ICatalog>{ 
        var re : Array<ICatalog> = [];
        re.push(this);
        for(let q of this.getSubCatalogs()) {
            re = re.concat(q.getSubCatalogsRecursively());
        }
        return re;
    }

    public getWriteableSubcatalogsRecursively(): Array<ICatalog>
    {
        return this.getSubCatalogsRecursively().filter(x => x.isWriteable());
    }

    public async getFilesRecursively(filter: IFilter = null): Promise<CatalogAndCatalogFile[]>
    {
        var re = await this.getFiles(filter);
        for(let q of this.getSubCatalogs())
        {
            var a = await q.getFilesRecursively(filter);
            re = re.concat(a);

        }
        return re;
    }


    public async initializeTags()
    {
        // this method is walking through the files assigned to this catalog
        // and adds them to the catalog summary (so that they can be used for type-ahead)

        this.tags = {};
        var files = await this.getFiles();
        for(let f of files){
            for (let t of Object.keys(f.file.tags)) {
                if(!this.tags[t]) this.tags[t] = [];
                var v = f.file.tags[t];
                var i = this.tags[t].indexOf(v);
                if(i < 0)
                   this.tags[t].push(v);
            }
        }
    }

    public AddSubCatalog(catalog: ICatalog)
    {
        var index = this.subcatalogs.indexOf(catalog);
        if(index < 0)
        {
            this.subcatalogs.push(catalog);
            catalog.setParent(this);
        }
    }
    public RemoveSubCatalog(catalog: ICatalog)
    {
        var index = this.subcatalogs.indexOf(catalog);
        if (index !== -1) {
            this.subcatalogs.splice(index, 1);
            catalog.setParent(null);
        }
    }
}
abstract class ReadonlyCatalog extends CatalogBase {
    public shareFiles(shareName: string, files: CatalogFile[], expirationSeconds: number, eventCallback: EventCallback): Promise<string> {
        throw new PixiError(E.OperationNotSupportedError);
    }

    public removeFile(file: CatalogFile, eventCallback: EventCallback): Promise<void> {
        throw new PixiError(E.NotImplementedError);
    }
    public saveFileMeta(cf: CatalogFile, eventCallback: EventCallback): Promise<void> {
        throw new PixiError(E.NotImplementedError);
    }
    public uploadFile(file: UploadFileDetails, eventCallback: EventCallback): Promise<CatalogAndCatalogFile> {
        throw new PixiError(E.NotImplementedError);
    }
}
export abstract class SharedCatalog extends ReadonlyCatalog {
    private static emptyCaps = new Set<CatalogCapability>([]);
    constructor (protected httpClient: HttpClientService, protected presignedUrl: string) {
        super();
    }
    public async downloadFileVersion(file: CatalogFile, version: string): Promise<ArrayBuffer> {
        var cfv : CatalogFileVersion = CatalogBase.findFileVersionOrThrow(file, version);
        var url = cfv.signedUrl;

        var downloadResult = await this.httpClient.downloadUrlAsArrayBuffer(url);
        return await this.transformDataForLoading(downloadResult, cfv.encryptionDetails);
    }
    public getCapabilities(): Set<CatalogCapability> {
        return SharedCatalog.emptyCaps;
    }
    public getUniqueId(): string {
        return this.presignedUrl;
    }
    public getShortId(): string {
        return Helper.getFileBaseName(this.presignedUrl);
    }
    protected abstract transformDataForLoading(data: ArrayBuffer, encryptionDetails: EncryptionDetails): Promise<ArrayBuffer>;
    public abstract async ProcessCatalogIndex(eventCallback: EventCallback, index: any) ;

    public async ProcessCatalogFiles(eventCallback: EventCallback, s3files?: ListResult) 
    {
        eventCallback(EventSeverity.Begin, "ProcessCatalogFiles");

        eventCallback(EventSeverity.Info, "Processing files of the catalog");

        this.filesByHash = {};
        this.filesByName = {};

        for(let file of this.files) {            
            if(file.findCatalogFileVersion(OriginalFileVersionKey) == null)
            {
                eventCallback(EventSeverity.Error, `File version (${OriginalFileVersionKey}) not found => entry is damaged; entry from catalog will be removed with next save: ${file}`)
                Helper.deleteArrayValue(this.files, file);
                continue;
            }
    
            // remembering this file entry by hash
            for(let q of Helper.ObjectValues(file.getHashes())) {
                this.filesByHash[q] = file;
            }
    
            this.filesByName[file.getFilename()] = file;    
        }

        eventCallback(EventSeverity.Info, "Processing tags");
        await this.initializeTags();

        eventCallback(EventSeverity.End, "ProcessCatalogFiles");
    }

}

export class SharedCatalogProtected extends SharedCatalog {
    constructor (httpClient: HttpClientService, presignedUrl: string, private masterKey: MasterKey) {
        super(httpClient, presignedUrl);
    }
    public getIsPasswordProtected(): boolean
    {
        return true;
    }
    protected async transformDataForLoading(data: ArrayBuffer, encryptionDetails: EncryptionDetails): Promise<ArrayBuffer>
    {
        var ed = Helper.createRaw(EncryptedData, encryptionDetails);
        ed.CipherText = data;
        return await Crypto.DecryptData(this.masterKey, ed);
    }

    
    public async ProcessCatalogIndex(eventCallback: EventCallback, index: RawCatalogIndexEncrypted): Promise<void>
    {
        eventCallback(EventSeverity.Begin, "ProcessCatalogIndex");
        
        eventCallback(EventSeverity.Info, "Decrypting catalog");
        var ab = await Crypto.DecryptData(this.masterKey, index.files);
        var abStr = Helper.ArrayBufferToUtf8String(ab);
        var rawFiles = JSON.parse(abStr);
        this.files = CatalogFileArray.fromJSON(rawFiles);

        eventCallback(EventSeverity.End, "ProcessCatalogIndex");
    }
}

export class SharedCatalogClear extends SharedCatalog {
    public getIsPasswordProtected(): boolean
    {
        return false;
    }
    protected async transformDataForLoading(data: ArrayBuffer, encryptionDetails: EncryptionDetails): Promise<ArrayBuffer>
    {
        return data;
    }

    
    public async ProcessCatalogIndex(eventCallback: EventCallback, index: RawCatalogIndexClear): Promise<void>
    {
        this.files = index.files;
    }
}

export abstract class StandardCatalog extends CatalogBase {

    private unkownFiles: string[] = [];
    private sharedCatalogIndexes: string[] = [];

    protected abstract async getCatalogIndex() : Promise<any>;

    constructor(protected s3: IS3)
    {
        super();
    }

    public getS3Connection(): S3Connection
    {
        return this.s3.GetConnection();
    }

    protected async saveSharedIndex(newIndex: RawCatalogIndexBase, shareName: string, expirationSeconds: number): Promise<string>
    {
        var body = Helper.toJsonArrayBuffer(newIndex);
        var filename = shareName+CatalogFileExtension;
        await this.s3.Upload(filename, body, JsonContentType);
        var url = await this.s3.GeneratePresignedUrlForDownload(filename, expirationSeconds);
        this.sharedCatalogIndexes.push(filename);
        return url;
    }

    public isWriteable(){
        return true; // TODO: this needs to be determined based on the s3 credentials supplied
    }    

    public getUnknownFiles(): string[]
    {
        return this.unkownFiles;
    }
    public getSharedCatalogIndexes(): string[]
    {
        return this.sharedCatalogIndexes;
    }

    protected abstract getKeyForBackupCatalogEntry(file: CatalogFile): string;

    protected abstract GetS3KeyForFile(file: CatalogFile, version: CatalogFileVersion): string;

    public getShortId(){
        return this.s3.GetConnection().getShortId();
    }
    public getUniqueId(){
        return this.s3.GetConnection().getUniqueId();
    }

    public async saveIndex(eventCallback: EventCallback = null): Promise<void>
    {
        if(eventCallback)
           eventCallback(EventSeverity.Begin, "saveIndex");

        var index = await this.getCatalogIndex();
        var indexStr = JSON.stringify(index, null, 2);
        var indexBuffer = Helper.StringToArrayBuffer(indexStr);

        if(eventCallback)
           eventCallback(EventSeverity.Info, "Saving index");
        await this.s3.Upload(MainCatalogFilename, indexBuffer, MainCatalogContentType);

        if(eventCallback)
           eventCallback(EventSeverity.End, "saveIndex");
    }

    public abstract async ProcessCatalogIndex(eventCallback: EventCallback, index: any) ;

    private removeDuplicateCatalogEntries(eventCallback: EventCallback){
        var seen = {};
        var i = 0;
        while(i < this.files.length)
        {
            var catFile = this.files[i];
            var hash = catFile.getSha256Hash();
            if(seen[hash])
            {
                eventCallback(EventSeverity.Warning, "Duplicate catalog entry is detected: "+catFile.getFilename());
                eventCallback(EventSeverity.Warning, "Duplicate entry will be removed at next save");
                this.files = this.files.splice(i, 1);
                i--;
            } 
            else
              seen[hash] = 1;

            i++;
        }

    }
    public async ProcessCatalogFiles(eventCallback: EventCallback, s3files?: ListResult) 
    {
        eventCallback(EventSeverity.Begin, "ProcessCatalogFiles");

        if(!s3files)
        {
            eventCallback(EventSeverity.Info, "Listing bucket "+this.getShortId());
            s3files = await this.s3.List();
        }

        eventCallback(EventSeverity.Info, "Processing files of the catalog");

        this.filesByHash = {};
        this.filesByName = {};
        var knownFiles = {};

        // removing duplicate catalog entries
        this.removeDuplicateCatalogEntries(eventCallback);

        // finding files that are not present anymore (and thus shall not be present in the catalog)
        for(let file of this.files) {            
            this.processCatalogEntry(file, eventCallback, s3files, knownFiles);
        }

        var indexToBeResaved = false;

        // we just iterated over the files in the catalog. 
        // Now lets see if there are any backup entries that we could restore.
        for(let q of Object.keys(s3files.KeyToObjectMap))
        {
            if(knownFiles[q]) continue;
            if(q == MainCatalogFilename) continue;

            if(!q.endsWith(".backup")) continue;

            eventCallback(EventSeverity.Info, `Found a backup file (${q}) which is not present in the main catalog. Trying to restore it.`);

            // this is an unknown backup file, it needs to be restored into the main catalog.
            var cf = await this.downloadBackupFile(q);
            await this.processCatalogEntry(cf, eventCallback, s3files, knownFiles);
            this.files.push(cf);

            indexToBeResaved = true;
        }

        this.sharedCatalogIndexes = [];
        this.unkownFiles = [];
        // we just iterated over the files in the catalog. Now lets do the reverse to see if there are any unknown files
        for(let q of Object.keys(s3files.KeyToObjectMap))
        {
            if(knownFiles[q]) continue;
            if(q == MainCatalogFilename) continue;

            if(q.endsWith(CatalogFileExtension))
            {
                this.sharedCatalogIndexes.push(q);
                continue;
            }

            // this is an unknown file
            this.unkownFiles.push(q);
        }

        // saving a new catalog index if we found some uploaded files that were missing from the catalog
        if(indexToBeResaved) {
            eventCallback(EventSeverity.Info, `Since some backup files were restored, saving the main catalog.`);
            await this.saveIndex();
        }

        eventCallback(EventSeverity.Info, "Processing tags");
        await this.initializeTags();

        eventCallback(EventSeverity.End, "ProcessCatalogFiles");
    }

    private async processCatalogEntry(file: CatalogFile, eventCallback: EventCallback, s3files: ListResult, knownFiles: any)
    {
        if(file.findCatalogFileVersion(OriginalFileVersionKey) == null)
        {
            eventCallback(EventSeverity.Error, `File version (${OriginalFileVersionKey}) not found => entry is damaged; entry from catalog will be removed with next save: ${file}`)
            Helper.deleteArrayValue(this.files, file);
            return;
        }

        eventCallback(EventSeverity.Begin, "processCatalogEntry");

        for(let v of file.versions)
        {
            var filenameKey = this.GetS3KeyForFile(file, v);
            
            if(
                (!s3files.KeyToObjectMap[filenameKey])
            )
            {
                eventCallback(EventSeverity.Error, `Missing file component (${v}) for: `+file)
                if(v.versionName == OriginalFileVersionKey) {
                    eventCallback(EventSeverity.Error, "Missing file component is the main file, removing entry from catalog with the next save");
                    Helper.deleteArrayValue(this.files, file);
                    continue;
                }

                // else we are removing this version only
                Helper.deleteArrayValue(file.versions, v);
                continue;
            }

            knownFiles[filenameKey] = 1;
        }

        // and lets see if the backup entry is present for this file
        var filenameKey = this.getKeyForBackupCatalogEntry(file);
        if(!s3files.KeyToObjectMap[filenameKey])
        {
            eventCallback(EventSeverity.Error, "Missing backup component for file, restoring: "+file);
            await this.saveBackupForFile(file);
        }

        // remembering this file entry by hash
        for(let q of Helper.ObjectValues(file.getHashes())) {
            this.filesByHash[q] = file;
        }

        this.filesByName[file.getFilename()] = file;

        knownFiles[filenameKey] = 1;

        eventCallback(EventSeverity.End, "processCatalogEntry");
    }

    private async downloadBackupFile(key: string) : Promise<CatalogFile>
    {
        var s3backup = await this.s3.Download(key);
        var strStr = Helper.ArrayBufferToUtf8String(s3backup.Data);
        var str: SaveTransformationResult = SaveTransformationResult.fromJSON(JSON.parse(strStr));
        var clearRealContent = await this.transformDataForLoading(str.MainContent, str.encryptionDetails);
        var cfStr = Helper.ArrayBufferToUtf8String(clearRealContent);
        return CatalogFile.fromJSON(JSON.parse(cfStr));
    }
    public async downloadFileVersion(file: CatalogFile, version: string): Promise<ArrayBuffer>
    {
        var cfv = CatalogBase.findFileVersionOrThrow(file, version);
        var key = this.GetS3KeyForFile(file, cfv);

        var downloadResult = await this.s3.Download(key);
        return await this.transformDataForLoading(downloadResult.Data, cfv.encryptionDetails);
    }
    public async uploadFileVersion(file: CatalogFile, version: string, data: ArrayBuffer, contentType: string): Promise<void>
    {
        var cfv = CatalogBase.findFileVersionOrThrow(file, version);
        var key = this.GetS3KeyForFile(file, cfv);

        var rawData = await this.transformDataForSaving(data);
        await this.s3.Upload(key, rawData.MainContent, this.getContentType(contentType));
        cfv.encryptionDetails = rawData.encryptionDetails;
    }
    private async saveBackupForFile(file: CatalogFile) : Promise<void>
    {
        var data = Helper.StringToArrayBuffer(JSON.stringify(file));        
        var key = this.getKeyForBackupCatalogEntry(file);

        var rawData = await this.transformDataForSaving(data);
        var rawDataStr = JSON.stringify(rawData);
        var rawDataAb = Helper.StringToArrayBuffer(rawDataStr);
        await this.s3.Upload(key, rawDataAb, JsonContentType);
    }
    protected getContentType(original: string): string
    {
        return original;
    }
    protected async transformDataForSaving(data: ArrayBuffer): Promise<SaveTransformationResult>
    {
        return Helper.createRaw(SaveTransformationResult, {MainContent: data});
    }
    protected async transformDataForLoading(data: ArrayBuffer, encryptionDetails: EncryptionDetails): Promise<ArrayBuffer>
    {
        return data;
    }

    public async removeFile(file: CatalogFile, eventCallback: EventCallback): Promise<void> {
        var hash = Helper.ObjectValues(file.getHashes())[0];
        // console.log("finding file with the same hash: "+hash, this.filesByHash);
        var entry = this.filesByHash[hash];
        if(!entry) 
        {
            eventCallback(EventSeverity.Error, `No file with the same hash is found, so not deleting anything: ${file.toString()}`);
            return;
        }

        eventCallback(EventSeverity.Begin, "removeFile");

        Helper.deleteArrayValue(this.files, entry);

        // removing the hash associations
        for(let q of Helper.ObjectValues(file.getHashes())) {
            delete this.filesByHash[q];
        }
        delete this.filesByName[file.getFilename()];

        var key = this.getKeyForBackupCatalogEntry(file);
        var toBeDeleted : S3.ObjectIdentifier[] = [{Key: key}];

        for(let version of file.versions) {
            key = this.GetS3KeyForFile(file, version);
            toBeDeleted.push({Key: key});
        }
        var c = toBeDeleted.length;
        eventCallback(EventSeverity.Info, `Removing ${c} file components for ${file.toString()}`);
        await this.s3.Delete(toBeDeleted);
        await this.saveIndex();

        eventCallback(EventSeverity.End, "removeFile");
    }

    // you are supposed to call initializeTags() after using this method!
    public async saveFileMeta(cf: CatalogFile, eventCallback: EventCallback): Promise<void>
    {
        if(this.files.indexOf(cf) < 0) {
            throw new PixiError(E.FileIsNotPartOfThisCatalog);
        }
        eventCallback(EventSeverity.Begin, "saveFileMeta");

        eventCallback(EventSeverity.Info, "Saving backup entry for "+cf)
        await this.saveBackupForFile(cf);

        eventCallback(EventSeverity.Info, "Saving index with the new file");
        await this.saveIndex();

        eventCallback(EventSeverity.End, "saveFileMeta");
    }
    public async uploadFile(file: UploadFileDetails, eventCallback: EventCallback): Promise<CatalogAndCatalogFile> {
        eventCallback(EventSeverity.Begin, "uploadFile");

        var hashes = {};
        for(let h of HashesToCalculate)
        {
            eventCallback(EventSeverity.Info, `Calculating ${h} hash for ${file.filename}`);
            hashes[h] = await Crypto.CalculateHashAsHexString(h, file.originalData);

            var alreadyPresent = this.filesByHash[hashes[h]];
            if(alreadyPresent)
            {
                eventCallback(EventSeverity.Info, "File "+file.filename+" is already uploaded under name "+alreadyPresent.getFilename())
                eventCallback(EventSeverity.End, "uploadFile");
                return {
                    catalog: this,
                    file:   alreadyPresent,
                }
            }
        }

        var cf = new CatalogFile();
        cf.versions = [];
        cf.versions.push({
            contentType: file.contentType,
            versionName: OriginalFileVersionKey,
        });
        for(let q of file.versions){
            cf.versions.push({
                contentType: q.contentType,
                versionName: q.versionName,
            })
        }
        cf.tags = {...file.tags};
        cf.setFilename(file.filename);
        cf.setContentSize(file.originalData.byteLength);
        cf.setContentType(file.contentType);
        cf.setMtimeDate(file.mtime);
        cf.setHashes(hashes);
        cf.initUploadDate();


        // now saving the original content
        eventCallback(EventSeverity.Info, "Saving the original file version")
        await this.uploadFileVersion(cf, OriginalFileVersionKey, file.originalData, file.contentType);

        // and versions
        for(let version of file.versions) {
            var ab = version.data;
            eventCallback(EventSeverity.Info, "Saving file version "+version)
            await this.uploadFileVersion(cf, version.versionName, ab, file.contentType);
        }

        // saving a backup file
        eventCallback(EventSeverity.Info, "Saving backup entry for "+cf)
        await this.saveBackupForFile(cf);
        
        this.files.push(cf);
        for(let q of Helper.ObjectValues(cf.getHashes()))
        {
            this.filesByHash[q] = cf;
        }
        eventCallback(EventSeverity.Info, "Saving index with the new file");
        await this.saveIndex();

        var re : CatalogAndCatalogFile = {
            catalog: this,
            file: cf,
        };

        eventCallback(EventSeverity.End, "uploadFile");

        return re;
    }
    public uploadOriginalFile(file: CatalogFile, data: ArrayBuffer, contentType: string): Promise<void>
    {
        return this.uploadFileVersion(file, OriginalFileVersionKey, data, contentType);
    }

    protected async shareFiles(files: CatalogFile[], expirationSeconds: number, eventCallback: EventCallback): Promise<CatalogFile[]>
    {
        eventCallback(EventSeverity.Begin, "shareFiles");
        eventCallback(EventSeverity.Info, "Calculating pre-signed URLs for the selected files");
        var newFiles : CatalogFile[] = [];
        for(let file of files) {
            var newFile = new CatalogFile();
            newFile.tags = file.tags;
            newFile.versions = [];
            for(let version of file.versions) {
                var key = this.GetS3KeyForFile(file, version);
                var newVersion = new CatalogFileVersion();
                newVersion.contentType = version.contentType;
                newVersion.versionName = version.versionName;

                newVersion.signedUrl = await this.s3.GeneratePresignedUrlForDownload(key, expirationSeconds);
                newFile.versions.push(newVersion);
            }
            newFiles.push(newFile);
        }
        eventCallback(EventSeverity.End, "shareFiles");
        return newFiles;
    }


}

export class StandardCatalogProtected extends StandardCatalog {
    constructor(s3: IS3, private masterKey: MasterKey, private catalogPasswordBlock: CatalogPasswordBlock)
    {
        super(s3);
    }

    public async shareFilesProtected(
        shareName: string, 
        password: string, 
        comment: string, 
        filesToShare: CatalogFile[], 
        expirationSeconds: number, 
        eventCallback: EventCallback
    ): Promise<string>
    {
        var newFiles = await this.shareFiles(filesToShare, expirationSeconds, eventCallback);
        // need to reencrypt the session keys
        // we generate a new masterkey first based on the password just provided
        
        var cpb = await Crypto.CatalogNewPasswordBlock(password, comment);
        var cmk = await Crypto.CatalogOpenPasswordBlock(password, cpb);
        var newIndex = new RawCatalogIndexEncrypted();

        for(var i = 0; i < newFiles.length; i++)
        {
            var newFile = newFiles[i];
            var oldFile = filesToShare[i];
            for(var j = 0; j < newFile.versions.length; j++)
            {
                var newVersion = newFile.versions[j];
                var oldVersion = oldFile.versions[j];

                var newEncryptionDetails = await Crypto.ReencryptWrapper(oldVersion.encryptionDetails, this.masterKey, cmk.MasterKey);
                newVersion.encryptionDetails = newEncryptionDetails;
            }
        }

        var filesData = Helper.toJsonArrayBuffer(newFiles);
        var encryptedFilesBlock = await Crypto.EncryptData(cmk.MasterKey, filesData);
        newIndex.files = encryptedFilesBlock;
        newIndex.passwordBlock = cpb;

        return this.saveSharedIndex(newIndex, shareName, expirationSeconds);
    }

    async delPassword(pw: CatalogWrappedMasterKey, eventCallback: EventCallback) {
        if(Helper.deleteArrayValue(this.catalogPasswordBlock.WrappedMasterKeys, pw))
           return await this.saveIndex(eventCallback);
    }
    async addPassword(password: string, comment: string, eventCallback: EventCallback) {
        eventCallback(EventSeverity.Begin, "addPassword");
        await Crypto.CatalogAppendPasswordBlock(this.masterKey, password, comment, this.catalogPasswordBlock);
        var re =  await this.saveIndex(eventCallback);
        eventCallback(EventSeverity.End, "addPassword");
        return re;
    }
    getPasswordBlock(): CatalogPasswordBlock
    {
        return this.catalogPasswordBlock;
    }
    getMasterKey(): MasterKey {
        return this.masterKey;
    }

    public getCapabilities(): Set<CatalogCapability> {
        var caps : CatalogCapability[] = [];
        if(this.isWriteable()) {
            caps.push(CatalogCapability.Writeable)
            caps.push(CatalogCapability.CreateClearSubCatalog);
            caps.push(CatalogCapability.CreatePasswordProtectedSubCatalog);
            caps.push(CatalogCapability.CreateKeyDerivedSubCatalog);
            caps.push(CatalogCapability.ManagePasswords);
            caps.push(CatalogCapability.ShareFilesProtected);
        }
        return new Set<CatalogCapability>(caps);
    }

    public async deriveCatalogPasswordBlock(): Promise<MasterKeyAndPasswordBlock>
    {
        var pb = await Crypto.CatalogNewDerivedPasswordBlock(this.masterKey);
        return Helper.create(MasterKeyAndPasswordBlock, {
            parentMasterKey: this.masterKey,
            catalogPasswordBlock: pb,
        });
    }

    protected getContentType(original: string): string
    {
        // we store everything encrypted wrapped in a json structure
        return JsonContentType;
    }

    protected async transformDataForSaving(data: ArrayBuffer): Promise<SaveTransformationResult>
    {
        var ed = await Crypto.EncryptData(this.masterKey, data);
        var ab = ed.CipherText;
        var details = new EncryptionDetails();
        for(let q of Object.keys(ed)) {
            if(q == "CipherText") continue;
            details[q] = ed[q];
        }

        var re = Helper.createRaw(SaveTransformationResult, {
            MainContent: ab,
            encryptionDetails: details,
        });
        return re;
    }
    protected async transformDataForLoading(data: ArrayBuffer, encryptionDetails: EncryptionDetails): Promise<ArrayBuffer>
    {
        var ed = Helper.createRaw(EncryptedData, encryptionDetails);
        ed.CipherText = data;
        return await Crypto.DecryptData(this.masterKey, ed);
    }

    protected getKeyForBackupCatalogEntry(file: CatalogFile): string
    {
        return StandardCatalogProtected.GetKeyForBackupCatalogEntry(file);
    }
    public static GetKeyForBackupCatalogEntry(file: CatalogFile): string
    {
        return StandardCatalogProtected.GetS3KeyForFile(file, "backup");
    }

    public static GetS3KeyForFile(file: CatalogFile, version: string): string
    {
        var hashes = file.getHashes();
        var hashNames = Object.keys(hashes);
        if(hashNames.length <= 0) throw new PixiError(E.CorruptFileEntryHashInCatalogError);
        var hash = hashes[hashNames[0]];
        return hash+(version? "."+version : "");
    }
    protected GetS3KeyForFile(file: CatalogFile, version: CatalogFileVersion): string
    {
        return StandardCatalogProtected.GetS3KeyForFile(file, version.versionName);
    }

    public getIsPasswordProtected(): boolean
    {
        return true;
    }

    protected async getCatalogIndex(files: CatalogFile[] = null, masterKey: MasterKey = null) : Promise<RawCatalogIndexEncrypted>
    {
        if(!files)
           files = this.files;
        if(!masterKey)
           masterKey = this.masterKey;

        var filesAsJsonStr = JSON.stringify(files);
        var filesAsJsonBuffer = Helper.StringToArrayBuffer(filesAsJsonStr);
        var encryptedFiles = await Crypto.EncryptData(this.masterKey, filesAsJsonBuffer);

        return Helper.create(RawCatalogIndexEncrypted, {
            passwordBlock: this.catalogPasswordBlock,
            files: encryptedFiles,
        })
    }

    public async ProcessCatalogIndex(eventCallback: EventCallback, index?: RawCatalogIndexEncrypted): Promise<void>
    {
        eventCallback(EventSeverity.Begin, "ProcessCatalogIndex");
        if(!index) {
            eventCallback(EventSeverity.Info, "Fetching catalog index");
            var ab = await this.s3.DownloadJson(MainCatalogFilename);
            index = RawCatalogIndexEncrypted.fromJSON(ab);
        }
        
        eventCallback(EventSeverity.Info, "Decrypting catalog");
        ab = await Crypto.DecryptData(this.masterKey, index.files);
        var abStr = Helper.ArrayBufferToUtf8String(ab);
        var rawFiles = JSON.parse(abStr);
        this.files = CatalogFileArray.fromJSON(rawFiles);

        eventCallback(EventSeverity.End, "ProcessCatalogIndex");
    }

}

export class StandardCatalogClear extends StandardCatalog {

    public async shareFilesClear(
        shareName: string, 
        filesToShare: CatalogFile[], 
        expirationSeconds: number, 
        eventCallback: EventCallback
    ): Promise<string>
    {
        var newFiles = await this.shareFiles(filesToShare, expirationSeconds, eventCallback);
        
        var newIndex = new RawCatalogIndexClear();
        newIndex.files = newFiles;

        return this.saveSharedIndex(newIndex, shareName, expirationSeconds);
    }
    
    public static GetS3KeyForFile(file: CatalogFile, version: string): string
    {
        var originalFilename = file.getFilename();
        var basename = Helper.getFileBaseName(originalFilename, true);
        var ext = Helper.getFileExtension(originalFilename);
        return basename+(version ? "."+version : "") + "."+ext;
    }
    public static GetKeyForBackupCatalogEntry(file: CatalogFile): string
    {
        return file.getFilename()+".backup";
    }

    public getCapabilities(): Set<CatalogCapability> {
        var caps : CatalogCapability[] = [];
        if(this.isWriteable()) {
            caps.push(CatalogCapability.Writeable)
            caps.push(CatalogCapability.CreateClearSubCatalog);
            caps.push(CatalogCapability.CreatePasswordProtectedSubCatalog);
            caps.push(CatalogCapability.ShareFilesClear);
        }
        return new Set<CatalogCapability>(caps);
    }

    protected getKeyForBackupCatalogEntry(file: CatalogFile): string
    {
        return StandardCatalogClear.GetKeyForBackupCatalogEntry(file);
    }

    protected GetS3KeyForFile(file: CatalogFile, version: CatalogFileVersion): string
    {
        return StandardCatalogClear.GetS3KeyForFile(file, version.versionName);
    }

    public getIsPasswordProtected(): boolean
    {
        return false;
    }

    protected async getCatalogIndex() : Promise<RawCatalogIndexClear>
    {
        return Helper.create(RawCatalogIndexClear, {
            files: this.files,
        })
    }

    public async ProcessCatalogIndex(eventCallback: EventCallback, index?: RawCatalogIndexClear): Promise<void>
    {
        eventCallback(EventSeverity.Begin, "ProcessCatalogIndex");

        if(!index) {
            eventCallback(EventSeverity.Info, "Fetching catalog index");
            var ab = await this.s3.DownloadJson(MainCatalogFilename);
            index = RawCatalogIndexClear.fromJSON(ab);
        }
        
        this.files = index.files;

        eventCallback(EventSeverity.End, "ProcessCatalogIndex");
    }

}

export class CombinedCatalog extends ReadonlyCatalog {
    private catalogs: CatalogDictionary = {};

    public getIsPasswordProtected(): boolean
    {
        return false;
    }

    public getFileByHash(hash: string): CatalogFile
    {
        return null;
    }
    public getFileByName(name: string): CatalogFile
    {
        return null;
    }

    public getCapabilities(): Set<CatalogCapability> {
        return new Set<CatalogCapability>([CatalogCapability.MountCatalog]);
    }

    public AddSubCatalog(catalog: ICatalog)
    {
        var key = catalog.getUniqueId();
        if(this.catalogs[key]) return; // already there

        this.catalogs[key] = catalog;
        super.AddSubCatalog(catalog);
    }
    public RemoveSubCatalog(catalog: ICatalog)
    {
        super.RemoveSubCatalog(catalog);
        delete this.catalogs[catalog.getUniqueId()];
    }
    public getUniqueId(): string {
        return NameOfCombinedCatalogRoot;
    }

    public getShortId() {
        return "combined";
    }

    downloadFileVersion(file: CatalogFile, version: string): Promise<ArrayBuffer> {
        throw new PixiError(E.OperationNotSupportedError);
    }
    downloadOriginalFile(file: CatalogFile): Promise<ArrayBuffer> {
        throw new PixiError(E.OperationNotSupportedError);
    }
}


@Injectable({
  providedIn: 'root'
})
export class CatalogService {

    constructor(private httpClient: HttpClientService)
    {
    }

    private async doTestParentKey(rawCatalogIndex: RawCatalogIndexEncrypted, parentMasterKey: MasterKey = null): Promise<MasterKey>
    {
        try{
            // console.log("doTestParentKey", parentMasterKey, rawCatalogIndex.passwordBlock)
            // this is an additional possibility, trying to derive the new masterkey
            if((!parentMasterKey)||(!rawCatalogIndex.passwordBlock.Derived))
               return null;

            return await Crypto.CatalogOpenDerivedPasswordBlock(parentMasterKey, rawCatalogIndex.passwordBlock)

        }catch(e){
            console.error("Unable to open catalog with parent master key", e)
            return null;
        }
    }
    private async doTestSecret(rawCatalogIndex: RawCatalogIndexEncrypted, secret: string|MasterKey, knownSecrets: string[]): Promise<MasterKey>
    {
        try{
            if(typeof(secret) == "string")
            {
                var c = await Crypto.CatalogOpenPasswordBlock(secret as string, rawCatalogIndex.passwordBlock);
                knownSecrets.push(secret);
                return c.MasterKey; // worked!
            }


            var catalogMasterKey = secret as MasterKey;
            await Crypto.CatalogVerifyMasterKey(catalogMasterKey, rawCatalogIndex.passwordBlock);
            // it was accepted!
            return catalogMasterKey;

        }catch(e){
            console.error("Unable to open catalog with the provided secret", e)
            return null;
        }
    }

    public async OpenStandardCatalog(
        connection: S3Connection,
        knownSecrets: string[], 
        secretProvider: S3PasswordCallback = null,        
        eventCallback: EventCallback = CatalogService.swallow, 
        parentMasterKey: MasterKey = null,
    ): Promise<StandardCatalog>
    {
        eventCallback(EventSeverity.Begin, "OpenStandardCatalog");
        eventCallback(EventSeverity.Info, `Opening a standard catalog: ${connection.getUniqueId()}`);

        var s3 = new S3Service(connection);
        var s3files = await s3.List();

        if(!s3files.KeyToObjectMap[MainCatalogFilename])
           throw new PixiError(E.CatalogEmptyError);

        var rawCatalogIndex;

        try{
            var catalogIndex = await s3.DownloadJson(MainCatalogFilename);
            rawCatalogIndex = RawCatalog.fromJSON(catalogIndex);    
        }catch(e){
            throw new PixiError(E.UnableToParseCatalogIndexError, e);
        }

        var catalogMasterKey : MasterKey = null;
        var re : StandardCatalog;
        var catalogPasswordBlock : CatalogPasswordBlock;
        if(rawCatalogIndex instanceof RawCatalogIndexEncrypted) 
        {
            eventCallback(EventSeverity.Info, `Standard catalog is password protected, trying to open it`);

            catalogMasterKey = await this.doTestParentKey(rawCatalogIndex, parentMasterKey);

            if(!catalogMasterKey)
            {
                for(let q of knownSecrets)
                {
                    catalogMasterKey = await this.doTestSecret(rawCatalogIndex, q, knownSecrets);
                    if(catalogMasterKey) break;
                }
            }

            if((!catalogMasterKey)&&(secretProvider))
            {
                // we still couldnt open the catalog, prompting for a password
                while(catalogMasterKey == null)
                {
                    var secret = await secretProvider(connection);
                    if(secret === null) break;
                    catalogMasterKey = await this.doTestSecret(rawCatalogIndex, secret, knownSecrets);
                }
            }

            if(!catalogMasterKey)
            {
                throw new PixiError(E.CatalogIsPasswordProtectedError);
            }

            // woohoo the password protected catalog is now open!
            catalogPasswordBlock = rawCatalogIndex.passwordBlock;

            re = new StandardCatalogProtected(s3, catalogMasterKey, catalogPasswordBlock);
        } 
        else if(rawCatalogIndex instanceof RawCatalogIndexClear) 
        {
            eventCallback(EventSeverity.Info, "Opening a standard clear catalog.");

            re = new StandardCatalogClear(s3);
        } else {
            throw new Error("This cant happen");
        }

        await re.ProcessCatalogIndex(eventCallback, rawCatalogIndex);

        // finding files that are not supposed to be present
        // and saving them in a list
        await re.ProcessCatalogFiles(eventCallback, s3files);


        // next step, opening the subcatalogs
        for(let q of s3files.Subdirs)
        {
            eventCallback(EventSeverity.Info, "Opening subdir as catalog: "+q);
            var subDirConn = S3Connection.AsSubdir(connection, q);
            try{
                var subcat = await this.OpenStandardCatalog(subDirConn, knownSecrets, secretProvider, eventCallback, catalogMasterKey);
                re.AddSubCatalog(subcat);
            }
            catch(e){
                eventCallback(EventSeverity.Error, "Unable to open subdir as catalog: "+e);
            }
        }      


        eventCallback(EventSeverity.End, "OpenStandardCatalog");

        return re;
    }

    public async OpenSharedCatalog(preSignedUrl: string, secretProvider: SharedPasswordCallback, eventCallback: EventCallback = CatalogService.swallow): Promise<SharedCatalog>
    {
        eventCallback(EventSeverity.Begin, "OpenSharedCatalog");
        eventCallback(EventSeverity.Info, `Opening a shared catalog: ${preSignedUrl}`);

        var rawCatalogIndex;

        try{
            rawCatalogIndex = await this.httpClient.downloadUrlAsType(RawCatalog, preSignedUrl);
        }catch(e){
            throw new PixiError(E.UnableToParseCatalogIndexError, e);
        }

        var catalogMasterKey : MasterKey = null;
        var re : SharedCatalog;
        if(rawCatalogIndex instanceof RawCatalogIndexEncrypted) 
        {
            eventCallback(EventSeverity.Info, `Shared catalog is password protected, trying to open it`);

            // we still couldnt open the catalog, prompting for a password
            while(catalogMasterKey == null)
            {
                console.log("trying to obtain password")
                var secret = await secretProvider(preSignedUrl);
                console.log("got", secret)
                if(secret === null) break;
                console.log("not null")
                var knownSecrets = [];
                catalogMasterKey = await this.doTestSecret(rawCatalogIndex, secret, knownSecrets);
                console.log("master is ", catalogMasterKey)
            }

            if(!catalogMasterKey)
            {
                throw new PixiError(E.CatalogIsPasswordProtectedError);
            }

            re = new SharedCatalogProtected(this.httpClient, preSignedUrl, catalogMasterKey);
        } 
        else if(rawCatalogIndex instanceof RawCatalogIndexClear) 
        {
            eventCallback(EventSeverity.Info, "Opening a clear shared catalog.");

            re = new SharedCatalogClear(this.httpClient, preSignedUrl);
        } else {
            throw new Error("This cant happen");
        }

        await re.ProcessCatalogIndex(eventCallback, rawCatalogIndex);
        await re.ProcessCatalogFiles(eventCallback);

        eventCallback(EventSeverity.End, "OpenSharedCatalog");

        return re;
    }

    public async CreateStandardCatalog(connection: S3Connection, secret?: string|MasterKeyAndPasswordBlock, comment?: string, eventCallback: EventCallback = CatalogService.swallow): Promise<StandardCatalog>
    {
        eventCallback(EventSeverity.Begin, "CreateStandardCatalog");

        eventCallback(EventSeverity.Info, "Verifying first whether the index indeed does not exist");
        var s3 = new S3Service(connection);
        var found;
        try {
            found = await s3.Download(MainCatalogFilename)
        }catch(e) {
            eventCallback(EventSeverity.Info, "The catalog index does not exist, proceeding");
        }

        if(found)
           throw new PixiError(E.CatalogAlreadyExistsError);

        var catalog : StandardCatalog;
        if(secret) {
            eventCallback(EventSeverity.Info, "Generating a new password protected catalog index");

            var passwordBlock : CatalogPasswordBlock;
            var catalogMasterKey : MasterKey;

            if(secret instanceof MasterKeyAndPasswordBlock)
            {
                passwordBlock = secret.catalogPasswordBlock;
                catalogMasterKey = await Crypto.CatalogOpenDerivedPasswordBlock(secret.parentMasterKey, passwordBlock)
            } else {
                passwordBlock = await Crypto.CatalogNewPasswordBlock(secret, comment);
                catalogMasterKey = (await Crypto.CatalogOpenPasswordBlock(secret, passwordBlock)).MasterKey;
            }

            catalog = new StandardCatalogProtected(s3, catalogMasterKey, passwordBlock);

        } else {
            catalog = new StandardCatalogClear(s3);
        }

        await catalog.saveIndex(eventCallback);

        eventCallback(EventSeverity.End, "CreateStandardCatalog");


        return catalog;
    }

    public NewCombinedCatalog(): CombinedCatalog
    {
        return new CombinedCatalog();
    }

    public async CreateClearSubCatalog(parent: StandardCatalog, subdir: string, eventCallback: EventCallback = CatalogService.swallow): Promise<StandardCatalogClear>
    {
        eventCallback(EventSeverity.Begin, "CreateClearSubCatalog");
        if(!parent.getCapabilities().has(CatalogCapability.CreateClearSubCatalog))
           throw new PixiError(E.InvalidCatalogOperationError);
        var newConn = S3Connection.AsSubdir(parent.getS3Connection(), subdir);

        var child = await this.CreateStandardCatalog(newConn, null, null, eventCallback) as StandardCatalogClear;
        parent.AddSubCatalog(child);
        eventCallback(EventSeverity.End, "CreateClearSubCatalog");
        return child;
    }

    public async CreateProtectedSubCatalog(parent: StandardCatalog, subdir: string, password: string, comment: string, eventCallback: EventCallback = CatalogService.swallow): Promise<StandardCatalogProtected>
    {
        eventCallback(EventSeverity.Begin, "CreateProtectedSubCatalog");
        if(!parent.getCapabilities().has(CatalogCapability.CreatePasswordProtectedSubCatalog))
           throw new PixiError(E.InvalidCatalogOperationError);
        var newConn = S3Connection.AsSubdir(parent.getS3Connection(), subdir);

        var child = await this.CreateStandardCatalog(newConn, password, comment, eventCallback) as StandardCatalogProtected;
        parent.AddSubCatalog(child);
        eventCallback(EventSeverity.End, "CreateProtectedSubCatalog");
        return child;
    }

    public async CreateKeyDerivedSubCatalog(parent: StandardCatalogProtected, subdir: string, eventCallback: EventCallback = CatalogService.swallow): Promise<StandardCatalogProtected>
    {
        eventCallback(EventSeverity.Begin, "CreateKeyDerivedSubCatalog");
        if(!parent.getCapabilities().has(CatalogCapability.CreateKeyDerivedSubCatalog))
           throw new PixiError(E.InvalidCatalogOperationError);
        var newConn = S3Connection.AsSubdir(parent.getS3Connection(), subdir);

        var pm = await parent.deriveCatalogPasswordBlock();

        var child = await this.CreateStandardCatalog(newConn, pm, null, eventCallback) as StandardCatalogProtected;
        parent.AddSubCatalog(child);
        eventCallback(EventSeverity.End, "CreateKeyDerivedSubCatalog");
        return child;
    }

    public async AddPassword(catalog: StandardCatalogProtected, password: string, comment: string, eventCallback: EventCallback = CatalogService.swallow): Promise<void>
    {
        await catalog.addPassword(password, comment, eventCallback);
    }

    public async DelPassword(catalog: StandardCatalogProtected, pw: CatalogWrappedMasterKey, eventCallback: EventCallback = CatalogService.swallow): Promise<void>
    {
        await catalog.delPassword(pw, eventCallback);
    }

    public GetPasswords(catalog: StandardCatalogProtected): CatalogWrappedMasterKey[]
    {
        return catalog.getPasswordBlock().WrappedMasterKeys;
    }

    static swallow(severity: EventSeverity, str: string){
        var method = (severity == EventSeverity.Begin)||(severity == EventSeverity.End) ? "log" : severity.toString();
        console[method](str);
    }
}
