import { TestBed } from '@angular/core/testing';

import { E } from '../app/error';
import { Helper, ComparisonOperator } from '../app/helper';
import { CatalogFile, IEntityWithName } from '../app/catalog.service';
import { LikeFilter, TagFilter, AndFilter, OrFilter, AnyFilter, FileSizeFilter, Filter, ParenthesesFilter, MetaFilter, NotFilter, DateType, DateFilter, YearMonthFilter, YearFilter, MonthFilter, DayFilter, HeightFilter, WidthFilter, DurationFilter } from '../app/filter';

var file = Helper.createRaw(CatalogFile, {
    tags: {
        "tagname": "tagvalue",
        "content.filename": "filename.txt",
        "content.type": "image/jpeg",
        "content.size": 123123,
        "hash.SHA-256": "hashvaluehexencoded",
        "date.upload": "2019-11-01T19:15:45.269Z",
        "media.width": 1024,
        "media.height": 768,
        "media.duration": 5.567,
    },
    versions: [],
})
var fileWithoutTags = Helper.createRaw(CatalogFile, {
    tags: {
    },
    versions: [],
})

describe('low level filter tests', ()=>{

    it('date filters', () => {
        var df;

        df = new DateFilter(ComparisonOperator.AtLeast, "2019-11-01", DateType.Upload);
        expect(df.asString()).toBe("date.upload >= 2019-11-01");
        expect(df.evaluate(file)).toBeTruthy();
        df = new DateFilter(ComparisonOperator.AtLeast, "2019-11-02", DateType.Upload);
        expect(df.evaluate(file)).toBeFalsy();

        df = new DateFilter(ComparisonOperator.AtLeast, "2019-11-01", DateType.Any);
        expect(df.asString()).toBe("date.any >= 2019-11-01");
        expect(df.evaluate(file)).toBeTruthy();
        df = new DateFilter(ComparisonOperator.AtLeast, "2019-11-01", DateType.Creation);
        expect(df.asString()).toBe("date.creation >= 2019-11-01");
        expect(df.evaluate(file)).toBeFalsy();

        df = new YearMonthFilter(ComparisonOperator.AtLeast, "2019-11", DateType.Upload);
        expect(df.evaluate(file)).toBeTruthy();
        df = new YearMonthFilter(ComparisonOperator.AtLeast, "2019-12", DateType.Upload);
        expect(df.evaluate(file)).toBeFalsy();


        df = new YearFilter(ComparisonOperator.AtLeast, 2019, DateType.Upload);
        expect(df.evaluate(file)).toBeTruthy();
        df = new YearFilter(ComparisonOperator.AtLeast, 2020, DateType.Upload);
        expect(df.evaluate(file)).toBeFalsy();

        df = new MonthFilter(ComparisonOperator.AtLeast, 11, DateType.Upload);
        expect(df.evaluate(file)).toBeTruthy();
        df = new MonthFilter(ComparisonOperator.AtLeast, 12, DateType.Upload);
        expect(df.evaluate(file)).toBeFalsy();

        df = new DayFilter(ComparisonOperator.AtLeast, 1, DateType.Upload);
        expect(df.evaluate(file)).toBeTruthy();
        df = new DayFilter(ComparisonOperator.AtLeast, 2, DateType.Upload);
        expect(df.evaluate(file)).toBeFalsy();

    })

    it('like/metafilter', () => {
        var lf = new LikeFilter("tags.content.type", "ge/j");
        expect(lf.evaluate(file)).toBeTruthy();
        expect(lf.asString()).toBe("meta:tags.content.type=*ge/j*");

        lf = new LikeFilter("tags.content.filename", "ename");        
        expect(lf.evaluate(file)).toBeTruthy();

        lf = new LikeFilter("tags.content.filename", "foobar");
        expect(lf.evaluate(file)).toBeFalsy();

        lf = new MetaFilter("tags.hash.SHA-256", "hash*");
        expect(lf.evaluate(file)).toBeTruthy();

        lf = new MetaFilter("tags.content.type", "image/jpeg");
        expect(lf.evaluate(file)).toBeTruthy();

        var filter = Filter.compile("meta:tags.content.filename=*what*");
        expect(filter.asString()).toBe("(meta:tags.content.filename=*what*)");
    });

    it('tagfilter', () => {
        var lf = new TagFilter("tag");
        expect(lf.evaluate(file)).toBeFalsy();
        expect(lf.asString()).toBe("tag:tag=*");

        lf = new TagFilter("tagname");
        expect(lf.evaluate(file)).toBeTruthy();
        expect(lf.asString()).toBe("tag:tagname=*");

        lf = new TagFilter("agname");
        expect(lf.evaluate(file)).toBeFalsy("shall not find partial matches");
        expect(lf.asString()).toBe("tag:agname=*");

        lf = new TagFilter("*agname");
        expect(lf.evaluate(file)).toBeTruthy("unless supported by wildcards");
        expect(lf.asString()).toBe("tag:*agname=*");

        lf = new TagFilter("tag*");
        expect(lf.evaluate(file)).toBeTruthy();
        expect(lf.asString()).toBe("tag:tag*=*");

        lf = new TagFilter("tagname", "tagv*");
        expect(lf.evaluate(file)).toBeTruthy("shall find partial matches when supported with wildcards");
        expect(lf.asString()).toBe("tag:tagname=tagv*");

        lf = new TagFilter("tagname","tagv");
        expect(lf.evaluate(file)).toBeFalsy("shall not find partial matches");

        var filter = Filter.compile("tag:tagname");
        expect(filter.asString()).toBe("(tag:tagname=*)");
 
        filter = Filter.compile("tag:tagname=tagv*");
        expect(filter.asString()).toBe("(tag:tagname=tagv*)");

    });

    it('notfilter', () => {
        var lf = new TagFilter("tagname");
        var not = new NotFilter(lf);
        expect(not.evaluate(file)).toBeFalsy();
        expect(not.asString()).toBe("NOT tag:tagname=*");
    });

    it('and', () => {
        var tf1 = new TagFilter("tag");
        var tf2 = new TagFilter("tagname");
        expect(tf1.evaluate(file)).toBeFalsy();
        expect(tf2.evaluate(file)).toBeTruthy();

        var asStr = "tag:tag=* AND tag:tagname=*"

        var and = new AndFilter(tf1, tf2);
        expect(and.evaluate(file)).toBeFalsy();
        expect(and.asString()).toBe(asStr);

        var p = new ParenthesesFilter(and);
        expect(p.evaluate(file)).toBeFalsy();
        expect(p.asString()).toBe("("+asStr+")");
    });

    it('or', () => {
        var tf1 = new TagFilter("tag");
        var tf2 = new TagFilter("tagname");
        expect(tf1.evaluate(file)).toBeFalsy();
        expect(tf2.evaluate(file)).toBeTruthy();

        var asStr = "tag:tag=* OR tag:tagname=*";

        var or = new OrFilter(tf1, tf2);
        expect(or.evaluate(file)).toBeTruthy();
        expect(or.asString()).toBe(asStr);

        var p = new ParenthesesFilter(or);
        expect(p.evaluate(file)).toBeTruthy();
        expect(p.asString()).toBe("("+asStr+")");
    });

    it('any', () => {
        var any = new AnyFilter("tagnam");
        expect(any.evaluate(file)).toBeTruthy("shall match tagname prefixes");
        expect(any.asString()).toBe("any:tagnam");

        any = new AnyFilter("agname");
        expect(any.evaluate(file)).toBeFalsy("shall not find partial tagnames");

        any = new AnyFilter("ashvaluehex");
        expect(any.evaluate(file)).toBeTruthy("shall match partial tag values");

    });


    it('filesize', () => {
        var lf = new FileSizeFilter(123123, ComparisonOperator.AtLeast);
        expect(lf.evaluate(file)).toBeTruthy();
        expect(lf.asString()).toBe("filesize>=123123");

        lf = new FileSizeFilter(123122, ComparisonOperator.AtLeast);
        expect(lf.evaluate(file)).toBeTruthy();

        lf = new FileSizeFilter(123124, ComparisonOperator.AtLeast);
        expect(lf.evaluate(file)).toBeFalsy()

        lf = new FileSizeFilter(123123, ComparisonOperator.AtMost);
        expect(lf.evaluate(file)).toBeTruthy();
        expect(lf.asString()).toBe("filesize<=123123");

        lf = new FileSizeFilter(123122, ComparisonOperator.AtMost);
        expect(lf.evaluate(file)).toBeFalsy();

        lf = new FileSizeFilter(123124, ComparisonOperator.AtMost);
        expect(lf.evaluate(file)).toBeTruthy()

        lf = new FileSizeFilter(123123, ComparisonOperator.Equals);
        expect(lf.evaluate(file)).toBeTruthy();
        expect(lf.asString()).toBe("filesize=123123");

        lf = new FileSizeFilter(123122, ComparisonOperator.Equals);
        expect(lf.evaluate(file)).toBeFalsy();

        var filter = Filter.compile("filesize>2M");
        expect(filter.asString()).toBe("(filesize>2097152)");
 
        filter = Filter.compile("filesize>=2M");
        expect(filter.asString()).toBe("(filesize>=2097152)");
 
        filter = Filter.compile("filesize >= 2M");
        expect(filter.asString()).toBe("(filesize>=2097152)");
    });

    it('width/height/duration', () => {
        var lf = new WidthFilter(1000, ComparisonOperator.AtLeast);
        expect(lf.evaluate(file)).toBeTruthy();
        expect(lf.asString()).toBe("width>=1000");

        lf = new WidthFilter(1025, ComparisonOperator.AtLeast);
        expect(lf.evaluate(file)).toBeFalsy();

        var hf = new HeightFilter(700, ComparisonOperator.AtLeast);
        expect(hf.evaluate(file)).toBeTruthy();
        expect(hf.asString()).toBe("height>=700");

        hf = new HeightFilter(769, ComparisonOperator.AtLeast);
        expect(hf.evaluate(file)).toBeFalsy();

        var df = new DurationFilter(5, ComparisonOperator.AtLeast);
        expect(df.evaluate(file)).toBeTruthy();
        expect(df.asString()).toBe("duration>=5");

        expect(df.evaluate(fileWithoutTags)).toBeFalsy();
    });


    
});

describe("parsing", ()=>{

    it("readNextToken", ()=>{
        var p  = Filter.readNextToken("");
        expect(p.nextToken).toEqual("");
        expect(p.rest).toEqual("");

        p  = Filter.readNextToken("foo bar boo");
        expect(p.nextToken).toEqual("foo");
        expect(p.rest).toEqual("bar boo");

        p = Filter.readNextToken("foo  bar boo");
        expect(p.nextToken).toEqual("foo");
        expect(p.rest).toEqual("bar boo");

        p = Filter.readNextToken("foo:bar boo");
        expect(p.nextToken).toEqual("foo:");
        expect(p.rest).toEqual("bar boo");

        p = Filter.readNextToken("key=value");
        expect(p.nextToken).toEqual("key");
        expect(p.rest).toEqual("=value");

        p = Filter.readNextToken("=value");
        expect(p.nextToken).toEqual("=");
        expect(p.rest).toEqual("value");

        p = Filter.readNextToken("key\\=value");
        expect(p.nextToken).toEqual("key=value");
        expect(p.rest).toEqual("");

        p = Filter.readNextToken("key\\ value");
        expect(p.nextToken).toEqual("key value");
        expect(p.rest).toEqual("");

        p = Filter.readNextToken("filesize<=1234");
        expect(p.nextToken).toEqual("filesize");
        expect(p.rest).toEqual("<=1234");

        p = Filter.readNextToken("filesize:<=1234");
        expect(p.nextToken).toEqual("filesize:");
        expect(p.rest).toEqual("<=1234");

        p = Filter.readNextToken("filesize<1234");
        expect(p.nextToken).toEqual("filesize");
        expect(p.rest).toEqual("<1234");

        p = Filter.readNextToken("filesize:<1234");
        expect(p.nextToken).toEqual("filesize:");
        expect(p.rest).toEqual("<1234");

        p = Filter.readNextToken("<=1234");
        expect(p.nextToken).toEqual("<=");
        expect(p.rest).toEqual("1234");

        p = Filter.readNextToken(">=1234");
        expect(p.nextToken).toEqual(">=");
        expect(p.rest).toEqual("1234");

        p = Filter.readNextToken("<1234");
        expect(p.nextToken).toEqual("<");
        expect(p.rest).toEqual("1234");

        p = Filter.readNextToken(">1234");
        expect(p.nextToken).toEqual(">");
        expect(p.rest).toEqual("1234");

        p = Filter.readNextToken("=1234");
        expect(p.nextToken).toEqual("=");
        expect(p.rest).toEqual("1234");

        p = Filter.readNextToken(">");
        expect(p.nextToken).toEqual(">");
        expect(p.rest).toEqual("");

        p = Filter.readNextToken("foo >");
        expect(p.nextToken).toEqual("foo");
        expect(p.rest).toEqual(">");

        p = Filter.readNextToken("!=1234");
        expect(p.nextToken).toEqual("!=");
        expect(p.rest).toEqual("1234");

        p = Filter.readNextToken("!= 1234");
        expect(p.nextToken).toEqual("!=");
        expect(p.rest).toEqual("1234");

        p = Filter.readNextToken("what != 1234");
        expect(p.nextToken).toEqual("what");
        expect(p.rest).toEqual("!= 1234");

        try{
            Filter.readNextToken("! 1234");
            fail("should have failed");
        }catch(e){
            expect(e.errorCode).toBe(E.FilterSyntaxErrorExclaimationMarkError);
        }

        p = Filter.readNextToken("what!ever");
        expect(p.nextToken).toEqual("what");
        expect(p.rest).toEqual("!ever");

    })

})

describe("filter expression parsing", ()=>{
  it("simple words are rendered into any expression", ()=>{
       var filter = Filter.compile("hello");
       expect(filter.asString()).toBe("(any:hello)");

       filter = Filter.compile("hello world");
       expect(filter.asString()).toBe("(any:hello AND any:world)");

  })

  it("negated expressions", ()=>{
    var filter = Filter.compile("not hello");
    expect(filter.asString()).toBe("(NOT any:hello)");

    filter = Filter.compile("not (hello world)");
    expect(filter.asString()).toBe("(NOT (any:hello AND any:world))");

  })


  it("id filters", ()=>{
    var filter = Filter.compile("id:subdir");
    expect(filter.asString()).toBe("(id:subdir)");
    var c : IEntityWithName = {
        getUniqueId(): string {
            return "foobar/subdir";
        },
        getShortId(): string {
            return "short";
        }
    };
    expect(filter.evaluate(file, c)).toBeTruthy();

    filter = Filter.compile("id:short");
    expect(filter.evaluate(file, c)).toBeFalsy();
  })

  it("date filters", ()=>{
    var filter = Filter.compile("date >= 2019-01-11");
    expect(filter.asString()).toBe("(date.any >= 2019-01-11)");
    expect(filter.evaluate(file, null)).toBeTruthy();

    var filter = Filter.compile("date.upload >= 2019-01-11");
    expect(filter.asString()).toBe("(date.upload >= 2019-01-11)");
    expect(filter.evaluate(file, null)).toBeTruthy();

    var filter = Filter.compile("date.creation >= 2019-01-11");
    expect(filter.asString()).toBe("(date.creation >= 2019-01-11)");
    expect(filter.evaluate(file, null)).toBeFalsy();

    var filter = Filter.compile("day > 1");
    expect(filter.asString()).toBe("(day.any > 1)");
    expect(filter.evaluate(file, null)).toBeFalsy();


  })


  it("and and or", ()=>{
       var filter = Filter.compile("hello and world and planet");
       expect(filter.asString()).toBe("(any:hello AND any:world AND any:planet)");

       filter = Filter.compile("hello or world or planet");
       expect(filter.asString()).toBe("(any:hello OR any:world OR any:planet)");

       // mixed expressions shall throw
       try{
          Filter.compile("hello and world or planet");
          fail("should have failed");
       }catch(e){
          expect(e.errorCode).toBe(E.MixedModeOfBooleanExpressionsIsNotSupportedInsideFilterExpressionsError);
       }

       try{
          Filter.compile("hello or world and planet");
          fail("should have failed");
       }catch(e){
          expect(e.errorCode).toBe(E.MixedModeOfBooleanExpressionsIsNotSupportedInsideFilterExpressionsError);
       }

       // but shall work with a single boolean:
       filter = Filter.compile("hello or world planet");
       expect(filter.asString()).toBe("(any:hello OR any:world OR any:planet)");

       // and also with additional parentheses:
       filter = Filter.compile("hello or (world and planet)");
       expect(filter.asString()).toBe("(any:hello OR (any:world AND any:planet))");

       filter = Filter.compile("hello and (world or planet)");
       expect(filter.asString()).toBe("(any:hello AND (any:world OR any:planet))");

       filter = Filter.compile("(hello or world) and planet");
       expect(filter.asString()).toBe("((any:hello OR any:world) AND any:planet)");
   })

   it("some more errors", ()=>{
       try{
            Filter.compile("(hello or world) and planet)");
            fail("should have failed");

       }catch(e){
           expect(e.errorCode).toBe(E.FilterExpressionSyntaxError);
       }

       for(let q of [":", ">", "=", "<", "<=", ">="]) 
       {
            var expr = "what "+q+" ever";
            try{
                    Filter.compile(expr);
                    fail("should have failed: "+expr);

            }catch(e){
                expect(e.errorCode).toBe(E.FilterSyntaxErrorColonSpace);
            }

       }
   })

   it('filter using the static method', () => {
    var any = new AnyFilter("tag");
    expect(Filter.evaluate(null, file)).toBeTruthy();
    expect(Filter.evaluate(any, file)).toBeTruthy();
  });

  it("escapeing", ()=>{
     expect(Filter.escapeTag("Foobar!")).toBe('Foobar\\!');
  })

})
