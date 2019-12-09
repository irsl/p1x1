import { AbstractControl } from "@angular/forms";

export class PixiValidators {

    public static NoIndex(control: AbstractControl) {
        if(!control.value) return null;

        var str : string = control.value.toString();

        if (str.toLowerCase() == "index") { // this is a reserved name
          return { reservedName: true };
        }
        return null;
    }
}