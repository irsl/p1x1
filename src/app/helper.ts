import { StringKeyValuePairs, TagKeyValuePairs, TagWeightPairs, TagNameMediaPrefix, TagNameHashPrefix, TagNameContentPrefix, TagNameDatePrefix } from './catalog.common';
import { PictureSize } from './image.service';
import { CloudData } from 'angular-tag-cloud-module';
import { VideoSizeAndDuration } from './video.service';

export enum ComparisonOperator {
    GreaterThan = ">",
    AtLeast = ">=",
    LessThan = "<",
    AtMost = "<=",
    Equals = "=",
    NotEquals = "!=",
}

export interface TagKeyValue {
    key: string;
    value: string;
    human: string;
}


export class Helper {
    private static enc = new TextEncoder();
    private static dec = new TextDecoder();

    public static toJsonArrayBuffer(inData: any): ArrayBuffer {
        var jsonStr = JSON.stringify(inData);
        return Helper.StringToArrayBuffer(jsonStr);
    }
    
    public static jsonArrayBufferToType<T>(TCreator: {new(): T}, inData: ArrayBuffer): T {
        var str = Helper.ArrayBufferToUtf8String(inData);
        var anyData = JSON.parse(str);
        return Helper.createRaw(TCreator, anyData, true);
    }

    public static selectCustomAndGenericTags(tagsToShow: TagKeyValue[], moreTagsToShow: TagKeyValue[]) {
        for(var i = 0; i < tagsToShow.length; i++)
        {
            var tag = tagsToShow[i];
            if(tag.key.match(/^(exif|media|content|date|hash)\./))
            {
                // generic tag
                moreTagsToShow.push(tag);
                Helper.deleteArrayValue(tagsToShow, tag);
                i--;
            }
        }
    }
    
    public static imageDimensionsToTags(dimensions: PictureSize): TagKeyValuePairs 
    {
        if(!dimensions) return {};
        return {
            "media.width": dimensions.width,
            "media.height": dimensions.height,
            "media.resolution": dimensions.width+"x"+dimensions.height,
        }
    }

    public static videoDimensionsToTags(dimensions: VideoSizeAndDuration): TagKeyValuePairs 
    {
        if(!dimensions) return {};
        var re = Helper.imageDimensionsToTags(dimensions);
        return {...re, "media.duration": dimensions.duration};
    }
    public static nowUnixtime(): number {
        var unix = Math.round(+new Date()/1000);
        return unix;
    }
    public static tagsToHash(tags: TagKeyValuePairs): TagKeyValue[] {
        var re : TagKeyValue[] = [];
        for(let key of Object.keys(tags)){
            var value = tags[key] || "";
            var human = value ? key+"="+value : key;
            re.push({
                key: key,
                value: value.toString(),
                human: human,
            });
        }
        return re;
    }
    public static intersectTags(allTags: StringKeyValuePairs[]): StringKeyValuePairs {
        var re : StringKeyValuePairs = {};
        if(!allTags) return re;
        var first = allTags.shift();
        if(!first) return re;
        for(let key of Object.keys(first))
        {
            var val = first[key];
            var allMatched = true;
            for(let nonFirst of allTags) {
                var oVal = nonFirst[key];
                if(oVal !== val)
                {
                    allMatched = false;
                    break;
                }
            }
            if(allMatched)
            {
                re[key] = val;
            }
        }

        return re;
    }
    
    public static classifyTags(tags: TagKeyValuePairs) {
        var unprotectedTags : StringKeyValuePairs = {};
        var protectedTags : TagKeyValuePairs = {};
        for(let q of Object.keys(tags)){
            var v = tags[q];
            if(Helper.isRestrictedTagNamespace(q)) 
               protectedTags[q] = v;
            else
               unprotectedTags[q] = (v||"").toString();
        }
        return {
            unprotectedTags: unprotectedTags,
            protectedTags: protectedTags,
        }
    }
    
    public static isRestrictedTagNamespace(tagKey: string): boolean{
        for(let q of [
            TagNameDatePrefix,
            TagNameContentPrefix,
            TagNameHashPrefix,
            TagNameMediaPrefix,
        ])
        {
            if(tagKey.indexOf(q) == 0)
               return true;
        }
        return false;
    }
    public static async BlobToArrayBuffer(blob: Blob): Promise<ArrayBuffer>
    {
        return await new Response(blob).arrayBuffer();
    }
    public static ArrayBufferToBlob(ab: ArrayBuffer, contentType: string): Blob
    {
        return new Blob([ab], {type: contentType});
    }
    public static isContentTypeKind(contentType: string, prefix: string): boolean{
        return contentType && contentType.startsWith(prefix+"/");
    }
    public static isImage(contentType: string): boolean{
        return this.isContentTypeKind(contentType, "image");
    }
    public static isVideo(contentType: string): boolean{
        return this.isContentTypeKind(contentType, "video");
    }
    public static humanTimestamp(dateObj: Date): string
    {
        return dateObj.toLocaleDateString(undefined, {minute: "2-digit", hour: "2-digit" });
    }
    public static humanFileSize(bytes: number, si = false) {
        var thresh = si ? 1000 : 1024;
        if(Math.abs(bytes) < thresh) {
            return bytes + ' B';
        }
        var units = si
            ? ['kB','MB','GB','TB','PB','EB','ZB','YB']
            : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
        var u = -1;
        do {
            bytes /= thresh;
            ++u;
        } while(Math.abs(bytes) >= thresh && u < units.length - 1);
        return bytes.toFixed(1)+' '+units[u];
    }
    public static parseHumanSize(size: string): number {
        var multiplier = 1;
        var sizeLower = size.toLowerCase();
        if((sizeLower.endsWith("m"))||(sizeLower.endsWith("mb")))
        {
            multiplier = 1024*1024;
        }
        else
        if((sizeLower.endsWith("k"))||(sizeLower.endsWith("kb")))
        {
            multiplier = 1024;
        }
        if((sizeLower.endsWith("g"))||(sizeLower.endsWith("gb")))
        {
            multiplier = 1024*1024*1024;
        }

        return parseInt(size, 10) * multiplier;
    }
    public static parseComparisonOperator(str: string): ComparisonOperator {
        for(let q of Object.keys(ComparisonOperator))
        {
            var v = ComparisonOperator[q];
            if(v == str) {
               return v;
            }
        }
    }

    // returns a string to value map of the enum specified
    public static getEnumMap(a: any) {
        var allShit = Object.values(a);
        var strs = allShit.filter(x => typeof(x) == "string");
        var values = allShit.filter(x => typeof(x) != "string");
        var re = {};
        for(let i = 0; i < strs.length; i++){
            var str = strs[i];
            var value = values[i];
            re[str.toString()] = value;
        }

        return re;
    }

    public static transformTagStatisticsToCloudData(stats: TagWeightPairs, sort: boolean = false): CloudData[]
    {
        var re : CloudData[] = [];
        for(let q of Object.keys(stats))
        {
            var weight = stats[q];
            re.push({text: q, weight: weight});
        }
        if(sort){
            re = re.sort((a,b)=>{
                // primary sort order is the weight, descending
                if(a.weight > b.weight)
                    return -1;
                if(a.weight < b.weight)
                    return 1;

                // secondary sort order is the text itself, ascending
                if(a.text > b.text)
                    return 1;
                if(a.text < b.text)
                    return -1;

                return 0;
            })
    
        }
        return re;
    }
    
    public static compareStuff(act: any, reference:any, operator: ComparisonOperator): boolean
    {
        switch(operator)
        {
            case ComparisonOperator.GreaterThan:
                return act > reference;
            case ComparisonOperator.AtLeast:
                return act >= reference;
            case ComparisonOperator.LessThan:
                return act < reference;
            case ComparisonOperator.AtMost:
                return act <= reference;
            case ComparisonOperator.Equals:
                return act == reference;
            case ComparisonOperator.NotEquals:
                return act != reference;
        }
    
        return false;
    }
    
    
    private static dateToLocal(d: Date): string
    {
        var local = new Date(d);
        local.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return local.toJSON();
    }
    public static dateToLocalYyyyMmDd(d: Date): string
    {
        return this.dateToLocal(d).slice(0, 10);
    }
    public static dateToLocalYyyyMm(d: Date): string
    {
        return this.dateToLocal(d).slice(0, 7);
    }
    public static ObjectValues(data: any): string[]
    {
        return Object.values(data);
        // return Object.keys(data).map(key => data[key]);
    }
    public static ArrayBufferToHexString(buffer: ArrayBuffer) : string
    {
        var s = '', h = '0123456789abcdef';
        (new Uint8Array(buffer)).forEach((v) => { s += h[v >> 4] + h[v & 15]; });
        return s;
    }
    public static HexStringToUint8Array(hexStr: string): Uint8Array
    {
        var typedArray = new Uint8Array(hexStr.match(/[\da-f]{2}/gi).map(function (h) {
            return parseInt(h, 16)
        }))
        return typedArray;
    }
    public static HexStringToArrayBuffer(hexStr: string): ArrayBuffer
    {
        return this.HexStringToUint8Array(hexStr).buffer as ArrayBuffer;
    }
  
    public static StringToUint8Array(str: string): Uint8Array
    {
      return this.enc.encode(str);
    }
    public static StringToArrayBuffer(str: string): ArrayBuffer
    {
      return this.StringToUint8Array(str).buffer as ArrayBuffer;
    }
    public static Uint8ArrayToUtf8String(buf: Uint8Array): string
    {
      return this.dec.decode(buf);
    }
    public static ArrayBufferToUtf8String(buf: ArrayBuffer): string
    {
      return this.Uint8ArrayToUtf8String(new Uint8Array(buf))
    }

    public static isNumber(value: string | number): boolean
    {
        return ((value != null) && !isNaN(Number(value.toString())));
    }

    public static mergeSets<T>(...sets: Set<T>[]): Set<T>
    {
        var re = new Set<T>();
        for(let s of sets) {

            for(let v of Array.from(s)) {
                re.add(v);
            }
        }
        return re;
    }
    public static unique<T>(...args: Array<T>[]): Set<T>
    {
        var allFlatten : Array<T> = [].concat(...args);
        return new Set<T>(allFlatten);
    }
    public static  uniqueArr<T>(...args: Array<T>[]): Array<T>
    {
        return Array.from(this.unique(...args));
    }
    public static getFileBaseName(str: string, removeExtension: boolean = false)
    {
       var re = str.substring(str.lastIndexOf('/') + 1); 
       if((removeExtension)&&(re.lastIndexOf(".") != -1))
          re = re.substring(0, re.lastIndexOf("."));
       return re;
    }
    public static wildcardToRegexp(rule: string, flags: string = "i") : RegExp
    {
        var escapeRegex = (str) => str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");

        // "."  => Find a single character, except newline or line terminator
        // ".*" => Matches any string that contains zero or more characters
        rule = rule.split("*").map(escapeRegex).join(".*");
      
        // "^"  => Matches any string with the following at the beginning of it
        // "$"  => Matches any string with that in front at the end of it
        rule = "^" + rule + "$"
      
        //Create a regular expression object for matching string
        return new RegExp(rule, flags);
    }
    public static wildcardMatch(target: string, rule: string) : boolean
    {
        return this.wildcardToRegexp(rule).test(target);
    }
    public static access(obj: any, exp: string)
    {
        var fields = exp.split(".");
        var v = undefined;
        var i = 0;
        for(let q of fields) {
            var prev = obj;
            v = obj = obj[q];
            if(v === undefined) 
            {
                var x = fields.slice(i);
                var nq = x.join(".");
                if(nq != q)
                    v = prev[nq];
                break;
            }
            i++;
        }
        return v;
    }
    
    public static createRawJson<T>(TCreator: { new (): T; }, jsonStr: string)
    {
        return this.createRaw(TCreator, JSON.parse(jsonStr), true);
    }

    public static createRaw<T>(TCreator: { new (): T; }, data: any, callFromJson: boolean = false): T
    {
        if((callFromJson)&&(TCreator["fromJSON"]))
           return TCreator["fromJSON"](data);

        return Object.assign(new TCreator(), data);
    }
    public static create<T>(TCreator: { new (): T }, data: T, callFromJson: boolean = false): T
    {
        return this.createRaw(TCreator, data, callFromJson);
    }
    public static deleteArrayValue(array: any, item: any): boolean
    {
        var index = array.indexOf(item);
        if (index !== -1) {
            array.splice(index, 1);
            return true;
        }
        else
            return false;
    }
    public static getFileExtension(filename: string)
    {
        return filename.split('.').pop();
    }
    public static async fileToArrayBuffer(file: File): Promise<ArrayBuffer>
    {
        return new Promise<ArrayBuffer>((resolve,reject)=>{
            var fileReader = new FileReader();
            fileReader.onerror = function(e){
                reject(e);
            }
            fileReader.onload = function(e){
                var ab = fileReader.result as ArrayBuffer;
                resolve(ab);
            }
            fileReader.readAsArrayBuffer(file)    
        })
    }
    public static async arrayBufferToDataUrl( buffer: ArrayBuffer, contentType: string = "application/octet-binary" ) : Promise<string>
    {
        return new Promise<string>((resolve)=>{
            var blob = Helper.ArrayBufferToBlob(buffer, contentType);
            var reader = new FileReader();

            reader.onload = function(this, evt){
                resolve(reader.result as string);
            };
            reader.readAsDataURL(blob);    
        })
    }

    public static arrayBufferToWindowUrl(arrayBuffer: ArrayBuffer, contentType: string): string
    {
        var blob = Helper.ArrayBufferToBlob(arrayBuffer, contentType);
        return URL.createObjectURL(blob);
    }

    public static async createObjectURL<T>(arrayBuffer: ArrayBuffer, contentType: string, callback: (url: string)=>Promise<T>): Promise<T>
    {
        var blob = Helper.ArrayBufferToBlob(arrayBuffer, contentType);
        var blobUrl = URL.createObjectURL(blob);
        try {
            return await callback(blobUrl);
        }finally{
            URL.revokeObjectURL(blobUrl);
        }        
    }


    // this is a dummy base64 to array buffer converter
    public static base64ToArrayBuffer(base64: string): ArrayBuffer
    {
        var byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        return byteArray.buffer as ArrayBuffer;
    }

    public static dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer
    {
        var b64 = dataUrl.substr(dataUrl.indexOf(',')+1)
        return this.base64ToArrayBuffer(b64);
    }

    public static callbackToPromise<T>(jobCallback: ((internalCallback: (err: Error, data: T)=>void )=>void)): Promise<T>
    {
        return new Promise<T>((resolve, reject)=>{
            jobCallback(function(err, data){
                if(err) return reject(err);
                return resolve(data);
            })
        })
    }

    public static trimSlashes(s: string): string
    {
      if(!s) return "";
      s = s.replace(/\/+$/, "");
      s = s.replace(/^\/+/, "");
      s = s.replace(/\/+/, "/");
      return s;
    }

}
