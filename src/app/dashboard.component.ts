import { Component, ViewChild, OnInit } from '@angular/core';
import { WorldService } from './world.service';
import { Router } from '@angular/router';
import { ICatalog, IStats, CombinedCatalog, CatalogCapability } from './catalog.service';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Helper } from './helper';
import { CloudData } from 'angular-tag-cloud-module';
import { Filter } from './filter';

interface IStatsInfo {
   original: IStats,
   catalog: ICatalog,
   catalogId: string,
   AllTags: number,
   AllFiles: number,
   SumFileSizeHuman: string,
}
@Component({
  templateUrl: '../templates/dashboard.component.html',
})
export class DashboardComponent implements OnInit  {

  private allCatalogs: ICatalog[];
  datasource : MatTableDataSource<IStatsInfo>;
  private catalogRoot: IStatsInfo;

  anyCatalogsAdded : boolean;
  columns = ["catalogId","AllTags","AllFiles","SumFileSizeHuman","actions"];

  private sumAllTags: number;
  private sumAllFiles: number;
  private sumSumFileSizeHuman: string;

  tagStatistics: CloudData[];

  @ViewChild(MatSort, {static: true}) sort : MatSort;
  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;

  constructor(private router: Router, private world: WorldService) {
  }

  applyFilter(filterValue: string) {
    this.datasource.filter = filterValue.trim().toLowerCase();
  }
  
  refresh()
  {
     this.allCatalogs = this.world.combinedCatalog.getSubCatalogsRecursively();
     // decoration
     this.sumAllTags= 0;
     this.sumAllFiles = 0;
     var sumSumFileSize = 0;

     var d : IStatsInfo[] = [];
     for (let q of this.allCatalogs) {
        var stats = q.getStats();
        var a : IStatsInfo = {
           catalog: q,
           catalogId: q.getUniqueId(),
           original: stats,
           AllTags: stats.AllTags,           
           AllFiles: stats.AllFiles,
           SumFileSizeHuman: Helper.humanFileSize(stats.SumFileSize),
        }

        var capMap = Helper.getEnumMap(CatalogCapability);
        for(let capStr of Object.keys(capMap)) {
          var cap = capMap[capStr];
          // console.log("checking shit", cap, capStr, q.isCapable(cap))
          a["cap"+capStr] = q.isCapable(cap);
        }

        if(q instanceof CombinedCatalog)
           this.catalogRoot = a;
        else
           d.push(a);
        
        this.sumAllTags += a.AllTags;
        this.sumAllFiles += a.AllFiles;
        sumSumFileSize += stats.SumFileSize;
     }

     this.sumSumFileSizeHuman = Helper.humanFileSize(sumSumFileSize);

     this.datasource = new MatTableDataSource<IStatsInfo>(d);
     this.datasource.sort = this.sort;    
     this.datasource.paginator = this.paginator;

     this.tagStatistics = Helper.transformTagStatisticsToCloudData(this.world.combinedCatalog.getTagStatisticsRecursively({hideProtectedTags: true}));

  }
  tagClicked(stuff: CloudData) {
    this.world.navigateToSearch("tag:"+Filter.escapeTag(stuff.text)+"=*");
  }
 
  ngOnInit() {
    this.anyCatalogsAdded = this.world.areAnyCatalogsAdded();

    this.world.openRootCatalog.subscribe(()=>{
      this.refresh();
    });
    this.refresh();

  }

}
