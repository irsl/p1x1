export interface TagWeightPairs {
    [key: string]: number;
}
export interface StringKeyValuePairs {
    [key: string]: string;
} 
export interface TagKeyValuePairs {
    [key: string]: string|number;
} 
export const TagNameMediaPrefix = "media.";
export const TagNameMediaWidth = TagNameMediaPrefix+"width";
export const TagNameMediaHeight = TagNameMediaPrefix+"height";
export const TagNameMediaDuration = TagNameMediaPrefix+"duration";

export const TagNameDatePrefix = "date.";
export const TagNameMtimeDate = TagNameDatePrefix+"mtime";
export const TagNameUploadDate = TagNameDatePrefix+"upload";
export const TagNameCreationDate = TagNameDatePrefix+"creation";
export const TagNameContentPrefix = "content.";
export const TagNameContentFilename = TagNameContentPrefix+"filename";
export const TagNameContentType = TagNameContentPrefix+"type";
export const TagNameContentSize = TagNameContentPrefix+"size";
export const TagNameHashPrefix = "hash.";

export enum EventSeverity {
    Begin = "begin",
    Info = "log",
    Warning = "warn",
    Error = "error",
    End = "end"
};
export interface EventCallback { (severity: EventSeverity, event: string): void }

