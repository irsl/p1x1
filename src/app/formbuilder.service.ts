import { Helper } from './helper';
import { FormControl, FormGroup, FormBuilder } from '@angular/forms';
import { Injectable } from '@angular/core';
import { _annotatedValidators, ValidationSettings } from './formbuilder.common';


export interface FormManager<T> {
    form: FormGroup,
    value: T,
    onSubmit(),
}

@Injectable({
    providedIn: 'root'
})
export class FormBuilderService {

    constructor(private formBuilder: FormBuilder)
    {
    }

    private buildFormGroup(instance: any): any {
        // console.log("building form for", instance, "Y", instance[_annotatedValidators])
        var gr = {};
        for(let aq of instance[_annotatedValidators] || "") {
            var q : ValidationSettings = aq as ValidationSettings;
            if(q.options.group) {
                instance[q.key] = new q.options.group();
                // console.log("XXX?X??X?X",instance, q.key, "X", q.options.group, instance[q.key], "XXX", instance[q.key][_annotatedValidators], "YYY", typeof instance[q.key])
                gr[q.key] = this.buildFormGroup(instance[q.key]);
            }
            else
               gr[q.key] = new FormControl(
                   deriveDefaultValue(q),
                   q.validators
               );
        }
        return this.formBuilder.group(gr);


        function deriveDefaultValue(q: ValidationSettings) {
            var v = instance[q.key];
            if(!q.options.castToBoolean) return v;
            return v ? "true" : "false";
        }
    }

    public BuildForm<T>(TCreator: { new (): T; }, onValidSubmit: (t: T)=>void, onInvalidSubmit?: ()=>void)
    {
        var annotatedInstance = new TCreator();

        var gr = this.buildFormGroup(annotatedInstance);

        var re: FormManager<T> = {
            form: gr,
            value: null,
            onSubmit: function(){

                re.form.updateValueAndValidity();
                re.form.markAllAsTouched();
                // console.log("submit?", re, re.form, re.form.invalid);

                if(re.form.invalid) {
                    // console.log("form is invalid!", re.form)
                    if(onInvalidSubmit)
                       onInvalidSubmit();
                    return;   
                }
                // console.log("form is valid!", re.form)

                // populating the values from the form into the type
                re.value = Helper.create(TCreator, re.form.value);
                delete re.value[_annotatedValidators];

                fixupBooleans(re.value, annotatedInstance);

                // dispatch back to the original type
                onValidSubmit(re.value);


                // note: annotations are lost when we create the final return type
                function fixupBooleans(instance: any, annotatedInstance: any){

                    // console.log("fixupbooleans", instance, "X", instance[_annotatedValidators]);
                    for(let aq of annotatedInstance[_annotatedValidators] || []) {
                        var setting = aq as ValidationSettings;
                        if(setting.options.group) {
                            // groups are screwed up as well (welcome to the pointless javascript world)
                            instance[setting.key] = Helper.create(setting.options.group, instance[setting.key]);
                            fixupBooleans(instance[setting.key], annotatedInstance[setting.key]);
                            continue;
                        }
                        if(!setting.options.castToBoolean) continue;
            
                        if(typeof(instance[setting.key]) == "string") {
                            instance[setting.key] = (instance[setting.key] == "true");
                        }
                    }

                }
            }
        }
        return re;

        
    }

}
