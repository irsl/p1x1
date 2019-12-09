import { CatalogFile,  IEntityWithName } from "./catalog.service";
import { Helper, ComparisonOperator } from "./helper";
import PixiError, { E } from "./error";

export interface IFilter {    
    evaluate(file: CatalogFile, catalog: IEntityWithName): boolean;
    asString(): string;
}
export enum DateType {
    Any = "any",
    Upload = "upload",
    Mtime = "mtime",
    Creation = "creation",
}

abstract class NumericAttributeBaseFilter implements IFilter {
    constructor(private stringName: string, private size: number, private op: ComparisonOperator)
    {
    }

    protected abstract getValue(file: CatalogFile): number;

    public evaluate(file: CatalogFile, catalog: IEntityWithName = null): boolean {
        var act = this.getValue(file);
        return Helper.compareStuff(act, this.size, this.op);
    }

    public asString(): string
    {
        return `${this.stringName}${this.op}${this.size}`
    }

    static compileRestGeneric<T extends IFilter>(
        TCreator: { new (size: number, op: ComparisonOperator): T; }, 
        rest: string
    ): CompileResult {

        var tpr = Filter.readNextToken(rest);
        var operator = tpr.nextToken;
        if([FilterKeyword.AtLeast.toString(), FilterKeyword.AtMost, FilterKeyword.Equals, FilterKeyword.GreaterThan, FilterKeyword.LessThan].indexOf(operator) < 0)
        {
            throw new PixiError(E.InvalidFileSizeOperatorError);
        }

        tpr = Filter.readNextToken(tpr.rest);
        var size = tpr.nextToken;

        var sizeAsNumber = Helper.parseHumanSize(size);

        var op : ComparisonOperator = Helper.parseComparisonOperator(operator);

        return {
            filter: new TCreator(sizeAsNumber, op),
            rest: tpr.rest,
        };                
    }

}

export class DurationFilter extends NumericAttributeBaseFilter {
    constructor(size: number, op: ComparisonOperator)
    {
        super("duration", size, op);
    }

    protected getValue(file: CatalogFile): number
    {
        console.log("duration", file, "RE: ", file.getDuration())
        return file.getDuration();
    }

    static compileRest(rest: string): CompileResult {

        return NumericAttributeBaseFilter.compileRestGeneric(DurationFilter, rest);
    }
}

export class FileSizeFilter extends NumericAttributeBaseFilter {
    constructor(size: number, op: ComparisonOperator)
    {
        super("filesize", size, op);
    }

    protected getValue(file: CatalogFile): number
    {
        return file.getContentSize();
    }

    static compileRest(rest: string): CompileResult {

        return NumericAttributeBaseFilter.compileRestGeneric(FileSizeFilter, rest);
    }
}

export class WidthFilter extends NumericAttributeBaseFilter {
    constructor(size: number, op: ComparisonOperator)
    {
        super("width", size, op);
    }

    protected getValue(file: CatalogFile): number
    {
        return file.getWidth();
    }

    static compileRest(rest: string): CompileResult {

        return NumericAttributeBaseFilter.compileRestGeneric(WidthFilter, rest);
    }
}

export class HeightFilter extends NumericAttributeBaseFilter {
    constructor(size: number, op: ComparisonOperator)
    {
        super("height", size, op);
    }

    protected getValue(file: CatalogFile): number
    {
        return file.getHeight();
    }

    static compileRest(rest: string): CompileResult {

        return NumericAttributeBaseFilter.compileRestGeneric(HeightFilter, rest);
    }
}


export abstract class DateFilterBase implements IFilter {
    constructor(private filterName: string, protected op: ComparisonOperator, protected dstr: any, private dateType: DateType)
    {
    }

    protected abstract transformFileDate(fileDate: Date): any;

    private evaluateAs(fileDate: Date): boolean {
        if(fileDate == null) return false;
        var act = this.transformFileDate(fileDate);
        return Helper.compareStuff(act, this.dstr, this.op);
    }
    public evaluate(file: CatalogFile, catalog: IEntityWithName): boolean {
        switch(this.dateType)
        {
            case DateType.Creation:
                 return this.evaluateAs(file.getCreationDate());
            case DateType.Mtime:
                return this.evaluateAs(file.getMtimeDate());
            case DateType.Upload:
                return this.evaluateAs(file.getUploadDate());
            default:
                return this.evaluateAs(file.getUploadDate()) || 
                       this.evaluateAs(file.getCreationDate()) ||
                       this.evaluateAs(file.getMtimeDate())
                ;

        }
    }

    public asString(): string
    {
        return `${this.filterName}.${this.dateType} ${this.op} ${this.dstr}`
    }

    static compileRestGeneric<T extends IFilter>(
        TCreator: { new (o: ComparisonOperator, d: any, t: DateType): T; }, 
        type: DateType, 
        rest: string
    ): CompileResult 
    {
        var tpr = Filter.readNextToken(rest);
        var opStr = tpr.nextToken;

        var op = Helper.parseComparisonOperator(opStr);
        if(!op)
        {
            throw new PixiError(E.FilterExpressionUnexpectedEndOfDateFilterError);
        }

        tpr = Filter.readNextToken(tpr.rest);
        var dstr : any = tpr.nextToken;
        if(!dstr)
        {
            throw new PixiError(E.FilterExpressionUnexpectedEndOfDateFilterError);
        }
        if(TCreator["WantsInteger"])
        {
            dstr = parseInt(dstr, 10);
        }

        return {
            filter: new TCreator(op, dstr, type),
            rest: tpr.rest,
        };                
    }
}

export class DateFilter extends DateFilterBase {
    public static FilterName = "date";
    constructor(op: ComparisonOperator, dstr: string, dateType: DateType)
    {
        super(DateFilter.FilterName, op, dstr, dateType);
    }

    protected transformFileDate(fileDate: Date): string
    {
        return Helper.dateToLocalYyyyMmDd(fileDate);
    }

    static compileRest(
        type: DateType, 
        rest: string
    ): CompileResult 
    {
        return DateFilterBase.compileRestGeneric(DateFilter, type, rest);
    }
}

export class YearMonthFilter extends DateFilterBase {
    public static FilterName = "yearmonth";
    constructor(op: ComparisonOperator, dstr: string, dateType: DateType)
    {
        super(YearMonthFilter.FilterName, op, dstr, dateType);
    }

    protected transformFileDate(fileDate: Date): string
    {
        return Helper.dateToLocalYyyyMm(fileDate);
    }

    static compileRest(
        type: DateType, 
        rest: string
    ): CompileResult 
    {
        return DateFilterBase.compileRestGeneric(YearMonthFilter, type, rest);
    }
}


export class YearFilter extends DateFilterBase {
    public static FilterName = "year";
    public static WantsInteger = true;
    constructor(op: ComparisonOperator, dstr: number, dateType: DateType)
    {
        super(YearFilter.FilterName, op, dstr, dateType);
    }

    protected transformFileDate(fileDate: Date): number
    {
        return fileDate.getFullYear();
    }

    static compileRest(
        type: DateType, 
        rest: string
    ): CompileResult 
    {
        return DateFilterBase.compileRestGeneric(YearFilter, type, rest);
    }
}

export class MonthFilter extends DateFilterBase {
    public static FilterName = "month";
    public static WantsInteger = true;
    constructor(op: ComparisonOperator, dstr: number, dateType: DateType)
    {
        super(MonthFilter.FilterName, op, dstr, dateType);
    }

    protected transformFileDate(fileDate: Date): number
    {
        return fileDate.getMonth()+1;
    }

    static compileRest(
        type: DateType, 
        rest: string
    ): CompileResult 
    {
        return DateFilterBase.compileRestGeneric(MonthFilter, type, rest);
    }
}

export class DayFilter extends DateFilterBase {
    public static FilterName = "day";
    public static WantsInteger = true;
    constructor(op: ComparisonOperator, dstr: number, dateType: DateType)
    {
        super(DayFilter.FilterName, op, dstr, dateType);
    }

    protected transformFileDate(fileDate: Date): number
    {
        return fileDate.getDate();
    }

    static compileRest(
        type: DateType, 
        rest: string
    ): CompileResult 
    {
        return DateFilterBase.compileRestGeneric(DayFilter, type, rest);
    }
}

export class IdFilter implements IFilter {
    constructor(private id: string)
    {
    }

    public evaluate(file: CatalogFile, catalog: IEntityWithName): boolean {
        return catalog.getUniqueId().indexOf(this.id) > -1;
    }

    public asString(): string
    {
        return `id:${this.id}`
    }

    static compileRest(rest: string): CompileResult {

        var tpr = Filter.readNextToken(rest);
        var id = tpr.nextToken;

        if(!id)
        {
            throw new PixiError(E.FilterExpressionUnexpectedEndOfIdError);
        }

        return {
            filter: new IdFilter(id),
            rest: tpr.rest,
        };                
    }
}

export class MetaFilter implements IFilter {
    private strRegex: RegExp;
    constructor(private field: string, private str: string)
    {
        this.strRegex= Helper.wildcardToRegexp(str);
    }

    public evaluate(file: CatalogFile, catalog: IEntityWithName = null): boolean {
        var v = Helper.access(file, this.field);
        if(!v) return false;
        return this.strRegex.test(v);
    }

    public asString(): string
    {
        return `meta:${this.field}=${this.str}`
    }

    static compileRest(rest: string): CompileResult {

        var tpr = Filter.readNextToken(rest);
        var field = tpr.nextToken;
        if(!field)
        {
            throw new PixiError(E.FilterExpressionUnexpectedEndOfMetaError);
        }

        tpr = Filter.readNextToken(tpr.rest);
        if(tpr.nextToken != FilterKeyword.Equals)
        {
            throw new PixiError(E.EqualitySignExpectedError);
        }

        tpr = Filter.readNextToken(tpr.rest);
        var value = tpr.nextToken;

        return {
            filter: new MetaFilter(field, value),
            rest: tpr.rest,
        };                
    }

}
export class LikeFilter extends MetaFilter {
    constructor(field: string, str: string)
    {
        super(field, "*"+str+"*");
    }
}
export class TagFilter implements IFilter {
    private tagName: string;
    private tagNameRegexp: RegExp;
    private tagValue: string;
    private tagValueRegexp: RegExp;

    constructor(tagName: string, tagValue: string = "")
    {
        this.tagName = tagName;
        this.tagValue = tagValue || "*";

        this.tagNameRegexp = Helper.wildcardToRegexp(this.tagName);
        this.tagValueRegexp = Helper.wildcardToRegexp(this.tagValue);
    }

    private evaulateTag(fileTagName: string, fileTagValue: string): boolean
    {
        if(!this.tagNameRegexp.test(fileTagName)) return false;
        if(!this.tagValueRegexp.test(fileTagValue)) return false;
        return true;
    }

    public evaluate(file: CatalogFile, catalog: IEntityWithName = null): boolean {
        for(let fileTagName of Object.keys(file.tags)){
            var fileTagValue = file.tags[fileTagName];
            if(this.evaulateTag(fileTagName, fileTagValue.toString()))
               return true;
        }
        return false;
    }

    public asString(): string
    {
        return "tag:"+Filter.escapeTag(this.tagName)+"="+Filter.escapeTag(this.tagValue);
    }

    static compileRest(rest: string): CompileResult {

        var tpr = Filter.readNextToken(rest);
        var tagName = tpr.nextToken;
        if(!tagName)
        {
            throw new PixiError(E.TagNameMissingError);
        }

        var tagValue;

        var lookAhead = Filter.readNextToken(tpr.rest);
        if(lookAhead.nextToken == FilterKeyword.Equals)
        {
            // the user specified a value as well
            tpr = Filter.readNextToken(lookAhead.rest);
            tagValue = tpr.nextToken;
        }

        return {
            filter: new TagFilter(tagName, tagValue),
            rest: tpr.rest,
        };                
    }    
}
export class NotFilter implements IFilter {
    constructor(private filter: IFilter)
    {
    }

    public evaluate(file: CatalogFile, catalog: IEntityWithName = null): boolean {
        return ! this.filter.evaluate(file, catalog);
    }

    public asString(): string
    {
        return "NOT "+this.filter.asString();
    }

    static compileRest(rest: string): CompileResult {

        var atpr = Filter.readNextToken(rest);
        var cr = Filter.compileExpression(atpr);

        return {
            filter: new NotFilter(cr.filter),
            rest: cr.rest
        }
    } 
}
export class AnyFilter implements IFilter {
    private filter: IFilter;
    constructor(private str: string)
    {
        this.filter = new ParenthesesFilter(
            new OrFilter(
                new TagFilter("*", "*"+str+"*"),
                new TagFilter(str+"*"),
            )
        );
    }

    public evaluate(file: CatalogFile, catalog: IEntityWithName = null): boolean {
        return this.filter.evaluate(file, catalog);
    }

    public asString(): string
    {
        return "any:"+this.str;
    }
}
abstract class AndOrFilter implements IFilter {
    protected filters: IFilter[];
    constructor(private joinStr: string, ...filters: IFilter[])
    {
        this.filters = filters;
    }

    protected abstract evaluateInner(file: CatalogFile, catalog: IEntityWithName): boolean;

    public evaluate(file: CatalogFile, catalog: IEntityWithName = null): boolean {
        if(this.filters.length <= 0) return false;
        return this.evaluateInner(file, catalog);
    }
    public asString(): string
    {
        if(this.filters.length <= 0) return "false";
        return this.filters.map(x => x.asString()).join(" "+this.joinStr+" ");
    }
}
export class OrFilter extends AndOrFilter {
    constructor(...filters: IFilter[])
    {
        super("OR", ...filters);
    }

    protected evaluateInner(file: CatalogFile, catalog: IEntityWithName): boolean {
        for(let q of this.filters){
            if(q.evaluate(file, catalog)) return true;
        }
        return false;
    }

}

export class ParenthesesFilter implements IFilter {
    constructor(private filter: AndOrFilter)
    {
    }

    public evaluate(file: CatalogFile, catalog: IEntityWithName = null): boolean {
        return this.filter.evaluate(file, catalog);
    }
    
    public asString(): string {
        return "("+this.filter.asString()+")";
    }

    static compileRest(rest: string): CompileResult {
        var filters: IFilter[] = [];
        var andOrMode : FilterKeyword;
        while(true) {
            var tpr = Filter.readNextToken(rest);
            var nextTokenLower = tpr.nextToken.toLowerCase();
            // console.log("foo", tpr, nextTokenLower, nextTokenLower == FilterKeyword.And)
            if(tpr.nextToken == "")
            {
                throw new PixiError(E.UnexpectedEndOfParenthesesBlockError);
            }
            else
            if(nextTokenLower == FilterKeyword.And)
            {
                if((andOrMode)&&(andOrMode != FilterKeyword.And))
                   throw new PixiError(E.MixedModeOfBooleanExpressionsIsNotSupportedInsideFilterExpressionsError);

                andOrMode = FilterKeyword.And;
                rest = tpr.rest;
            }
            else
            if(nextTokenLower == FilterKeyword.Or)
            {
                if((andOrMode)&&(andOrMode != FilterKeyword.Or))
                   throw new PixiError(E.MixedModeOfBooleanExpressionsIsNotSupportedInsideFilterExpressionsError);

                andOrMode = FilterKeyword.Or;
                rest = tpr.rest;
            }
            else
            if(tpr.nextToken == FilterKeyword.ParenthesesEnd)
            {
                // our parentheses block was just closed.

                // was anything added?
                if(!filters.length)
                   throw new PixiError(E.EmptyParenthesesBlockFilterExpressionError);

                // defaulting to AND mode
                if(!andOrMode) andOrMode = FilterKeyword.And;

                var afilter = null;
                if(andOrMode == FilterKeyword.And)
                {
                    afilter = new AndFilter(...filters);
                }
                else
                if(andOrMode == FilterKeyword.Or)
                {
                    afilter = new OrFilter(...filters);
                }

                return {
                    filter: new ParenthesesFilter(afilter),
                    rest: tpr.rest,
                }
            }    
            else {
                // otherwise lets try to read it using the main parser
                var atpr = Filter.compileExpression(tpr);
                filters.push(atpr.filter);
                rest = atpr.rest;
            }

        }
    }
}
export class AndFilter extends AndOrFilter {
    constructor(...filters: IFilter[])
    {
        super("AND", ...filters);
    }

    protected evaluateInner(file: CatalogFile, catalog: IEntityWithName): boolean {
        for(let q of this.filters){
            if(!q.evaluate(file, catalog)) 
               return false;
        }
        return true;

    }

}
interface TokenParseResult {
    nextToken: string;
    rest: string;
}
interface CompileResult {
    filter: IFilter;
    rest: string;
}
enum FilterKeyword {
    ParenthesesBegin = '(',
    ParenthesesEnd = ')',
    And = 'and',
    Or = 'or',
    GreaterThan = ">",
    AtLeast = ">=",
    LessThan = "<",
    AtMost = "<=",
    Equals = "=",
}
export class Filter {

    public static evaluate(filter: IFilter, file: CatalogFile, catalog: IEntityWithName=null): boolean
    {
        if(!filter) return true;
        return filter.evaluate(file, catalog);
    }

    public static compile(expression: string): IFilter
    {
        if((!expression)||(!expression.trim())) return null; // no filtering

        var cr = this.compileExpression({nextToken: "(", rest: expression+")"});

        if(cr.rest)
           throw new PixiError(E.FilterExpressionSyntaxError);

        return cr.filter;
    }
    static compileExpression(tpr: TokenParseResult): CompileResult
    {
        var tokenSmall = tpr.nextToken.toLowerCase();
        switch(tokenSmall)
        {
            case FilterKeyword.ParenthesesBegin:
                return ParenthesesFilter.compileRest(tpr.rest);
            case "meta:":
                return MetaFilter.compileRest(tpr.rest);
            case "id:":
                return IdFilter.compileRest(tpr.rest);
            case "filesize": // note: no colon at the end
                return FileSizeFilter.compileRest(tpr.rest);
            case "width": // note: no colon at the end
                return WidthFilter.compileRest(tpr.rest);
            case "height": // note: no colon at the end
                return HeightFilter.compileRest(tpr.rest);
            case "duration": // note: no colon at the end
                return DurationFilter.compileRest(tpr.rest);
            case "tag:":
                return TagFilter.compileRest(tpr.rest);
            case "not":
                return NotFilter.compileRest(tpr.rest);
            case "date":
            case "date.any":
                return DateFilter.compileRest(DateType.Any, tpr.rest);
            case "date.upload":
                return DateFilter.compileRest(DateType.Upload, tpr.rest);
            case "date.creation":
                return DateFilter.compileRest(DateType.Creation, tpr.rest);        
            case "date.mtime":
                return DateFilter.compileRest(DateType.Mtime, tpr.rest);        
            case "yearmonth":
            case "yearmonth.any":
                return YearMonthFilter.compileRest(DateType.Any, tpr.rest);
            case "yearmonth.upload":
                return YearMonthFilter.compileRest(DateType.Upload, tpr.rest);
            case "yearmonth.creation":
                return YearMonthFilter.compileRest(DateType.Creation, tpr.rest);                
            case "yearmonth.mtime":
                return YearMonthFilter.compileRest(DateType.Mtime, tpr.rest);
            case "year":
            case "year.any":
                return YearFilter.compileRest(DateType.Any, tpr.rest);
            case "year.upload":
                return YearFilter.compileRest(DateType.Upload, tpr.rest);
            case "year.creation":
                return YearFilter.compileRest(DateType.Creation, tpr.rest);                
            case "year.mtime":
                return YearFilter.compileRest(DateType.Mtime, tpr.rest);                
            case "month":
            case "month.any":
                return MonthFilter.compileRest(DateType.Any, tpr.rest);
            case "month.upload":
                return MonthFilter.compileRest(DateType.Upload, tpr.rest);
            case "month.creation":
                return MonthFilter.compileRest(DateType.Creation, tpr.rest);        
            case "month.mtime":
                return MonthFilter.compileRest(DateType.Mtime, tpr.rest);        
            case "day":
            case "day.any":
                return DayFilter.compileRest(DateType.Any, tpr.rest);
            case "day.upload":
                return DayFilter.compileRest(DateType.Upload, tpr.rest);
            case "day.creation":
                return DayFilter.compileRest(DateType.Creation, tpr.rest);        
            case "day.mtime":
                return DayFilter.compileRest(DateType.Mtime, tpr.rest);        
            case "<":
            case "<=":
            case ">=":
            case ">":
            case "!=":
            case "=":
            case ":":
                throw new PixiError(E.FilterSyntaxErrorColonSpace);
            default:
                return { filter: new AnyFilter(tpr.nextToken), rest: tpr.rest };
        }

    }

    static escapeTag(str: string){
        return str.replace("\\", "\\\\").replace("!", "\\!");
    }

    static readNextToken(str: string): TokenParseResult
    {
        var token = "";

        var i = 0;
        while(i < str.length) {
            var c = str.charAt(i);

            // escaping
            if(c == '\\')
            {
                i++;
                c = str.charAt(i);
            }
            else
            if(c == ":")
            {
                token += c;
                i++;
                break;
            }
            else
            // whitespace
            if(c <= " ")
            {
                break;
            }
            else
            // some operators
            if(['(',')','>','<','=','!'].indexOf(c) > -1)
            {
                if(i > 0) {
                    // a word preceeding this operator, so need to jump out
                    break;
                }
                else
                if((c == "(")||(c==")"))
                {
                    i++;
                    token += c;
                    break;
                }
                else
                if(['>','<','!'].indexOf(c) > -1)
                {
                    i++;
                    // looking ahead
                    var c2 = str.charAt(i);
                    if(c2 == "=")
                    {
                        i++; // need to include the equality sign as well
                        token += c+c2;
                        break;
                    }    
                    else if(c != "!")
                    {
                        // but > and < are valid operators even without the equality, so 
                        token += c;
                        break;
                    }
                    else
                    {
                        // a standalone exclaimation mark detected, throwing
                        throw new PixiError(E.FilterSyntaxErrorExclaimationMarkError);
                    }
                }
                else    
                if(c == "=")
                {
                    i++; // need to include the equality sign as well
                    token += c;
                    break;
                }    
            }
            
            token += c;
            i++;
        }

        var rest = str.substr(i).trim();

        return {
            nextToken: token,
            rest: rest,
        }
    }
}
