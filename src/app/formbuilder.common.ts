
export const _annotatedValidators = "_annotatedValidators";
export interface ValidationOptions {
    castToBoolean?: boolean;
    group?: { new (): any; };
}
export interface ValidationSettings {
    key: string;
    validators: Array<any>;
    options: ValidationOptions;
}
export function Validate(validatorsArray: Array<any>, moreOptions: ValidationOptions = {}) 
{
    return function (target, propertyKey: string): any {
        // console.log("shithole", target, "X", propertyKey);
        if(!target[_annotatedValidators]) target[_annotatedValidators] = [];
        var r = target[_annotatedValidators] as Array<ValidationSettings>;
        var setting : ValidationSettings = {key: propertyKey, validators: validatorsArray, options: moreOptions};
        r.push(setting);
    }
}
