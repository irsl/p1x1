import { FormBuilderService } from "src/app/formbuilder.service";
import "reflect-metadata";
import { Validators, FormBuilder } from "@angular/forms";
import { TestBed } from "@angular/core/testing";
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { Validate } from "src/app/formbuilder.common";
import { Helper } from "src/app/helper";


describe('formbuilder tests', ()=>{
    let formBuilder: FormBuilderService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                FormBuilder
              ],
        });
        formBuilder = TestBed.get(FormBuilderService);
    });

    it('should be created', () => {
        expect(formBuilder).toBeTruthy();
    });

    it('form builder helper creating a proper formgroup', () => {
        class SampleClass {
            field1: boolean;
            field2: string = "whatever";

            @Validate([Validators.required])
            field3: string = "defaultvalue";

            @Validate([Validators.required])
            field4: string;

            @Validate([Validators.required], {castToBoolean: true})
            field5: boolean;

        }

        var lastCallbackWith: SampleClass;
        var callbackSuccess = 0;
        var callbackInvalid = 0;
        var re = formBuilder.BuildForm(SampleClass, (t: SampleClass)=>{
            callbackSuccess++;
            lastCallbackWith = t;
        }, ()=>{
            callbackInvalid++;
        });

        expect(re.form.get("field1")).toBeNull("not annotated fields are not added to the form");
        expect(re.form.get("field2")).toBeNull("not annotated fields are not added to the form (even if they have a default value)");
        expect(re.form.get("field3").value).toEqual("defaultvalue", "default field initializers shall propagate into the form");
        expect(re.form.get("field4").value).toBeFalsy();
        expect(re.form.get("field5").value).toEqual('false', "this field was marked with string caster");

        re.onSubmit();
        expect(callbackSuccess).toEqual(0, "if the form is invalid, the user supplied onsubmit handler is not invoked");
        expect(callbackInvalid).toEqual(1, "invalid callback called");

        re.form.get("field4").setValue("newvalue");
        expect(re.form.get("field4").value).toBe("newvalue");
        re.form.get("field5").setValue(false);

        re.onSubmit();
        expect(callbackSuccess).toEqual(1, "if the form is valid, the user supplied onsubmit handler is invoked");
        expect(callbackInvalid).toEqual(1, "invalid callback not called");

        expect(lastCallbackWith).toBeTruthy();
        expect(lastCallbackWith.field2).toBe("whatever", "original value of not annotated fields shall show up in the instance");        
        expect(lastCallbackWith.field3).toBe("defaultvalue", "same with annotated ones");        
        expect(lastCallbackWith.field4).toEqual("newvalue", "this value was set via the form");
        expect(lastCallbackWith.field5).toEqual(false, "this value was set via the form");

        // shall work with "false"
        re.form.get("field5").setValue("false");
        re.onSubmit();
        expect(callbackSuccess).toEqual(2, "if the form is valid, the user supplied onsubmit handler is invoked");
        expect(callbackInvalid).toEqual(1, "invalid callback not called");
        expect(lastCallbackWith.field5).toEqual(false, "note even if we set this as a string a proper the class instance shall get a proper boolean!");

        // shall work with "true"
        re.form.get("field5").setValue("true");
        re.onSubmit();
        expect(callbackSuccess).toEqual(3, "if the form is valid, the user supplied onsubmit handler is invoked");
        expect(callbackInvalid).toEqual(1, "invalid callback not called");
        expect(lastCallbackWith.field5).toEqual(true, "note even if we set this as a string a proper the class instance shall get a proper boolean!");

    });

    it('form with subgroups', () => {
        class SubClass {
            @Validate([Validators.required])
            subfield: string;

            @Validate([Validators.required], {castToBoolean: true})
            subboolean: boolean;
        }
        class MainClass {
            @Validate([])
            irrelevant: string;

            @Validate([], {group: SubClass})
            sub: SubClass;
        }

        var lastCallbackWith: MainClass;
        var callbackSuccess = 0;
        var re = formBuilder.BuildForm(MainClass, (t: MainClass)=>{
            callbackSuccess++;
            lastCallbackWith = t;
        });

        expect(re.form.get("sub")).toBeTruthy("sub field should be a group");
        expect(re.form.get("sub").get("subfield")).toBeTruthy("and the subfield shall be found");
        re.onSubmit();
        expect(callbackSuccess).toEqual(0, "subfield is required and not set");

        re.form.get("sub").get("subfield").setValue("newvalue");
        re.form.get("sub").get("subboolean").setValue("true");
        re.onSubmit();
        expect(callbackSuccess).toEqual(1, "subfield is required and is now set");
        var expected = Helper.createRaw(SubClass, {subfield: "newvalue", subboolean: true});
        expect(lastCallbackWith.sub).toEqual(expected, "note: even the boolean was casted from string!");

    });

    it('form with subgroups - type safety', () => {
        class SubClass {
            @Validate([Validators.required])
            subfield: string;

            public someMethod(){
                return this.subfield+" X "+this.subfield;
            }
        }
        class MainClass {
            @Validate([], {group: SubClass})
            sub: SubClass;
        }

        var lastCallbackWith: MainClass;
        var callbackSuccess = 0;
        var re = formBuilder.BuildForm(MainClass, (t: MainClass)=>{
            callbackSuccess++;
            lastCallbackWith = t;
        });

        re.form.get("sub").get("subfield").setValue("newvalue");
        re.onSubmit();
        expect(callbackSuccess).toEqual(1, "subfield is required and is now set");
        var expected = Helper.createRaw(SubClass, {subfield: "newvalue"});
        expect(lastCallbackWith.sub).toEqual(expected, "stuff was set");

        var m = lastCallbackWith.sub.someMethod();
        expect(m).toBe("newvalue X newvalue", "the returned instance must be type safe");

    });

})
