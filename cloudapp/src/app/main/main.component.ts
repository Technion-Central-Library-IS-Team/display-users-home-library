import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  CloudAppRestService, CloudAppEventsService, Request, HttpMethod,
  Entity, PageInfo, RestErrorResponse
} from '@exlibris/exl-cloudapp-angular-lib';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy {

  private pageLoad$: Subscription;
  pageEntities: Entity[];
  private _apiResult: any;

  hasApiResult: boolean = false;
  loading = false;

  private displayTable: boolean = false;

  constructor(private restService: CloudAppRestService,
    private eventsService: CloudAppEventsService,
    private toastr: ToastrService) { }

  ngOnInit() {
    this.pageLoad$ = this.eventsService.onPageLoad(this.onPageLoad);
  }

  ngOnDestroy(): void {
    this.pageLoad$.unsubscribe();
  }

  get apiResult() {
    return this._apiResult;
  }

  set apiResult(result: any) {
    this._apiResult = result;
    this.hasApiResult = result && Object.keys(result).length > 0;
  }

  onPageLoad = (pageInfo: PageInfo) => {
    this.pageEntities = pageInfo.entities;

    if ((this.pageEntities).length > 0) {

      for (let i = 0; i < this.pageEntities.length; i++) {
        console.log("This link >>> " + this.pageEntities[i].link);
        let linkSplitted = (this.pageEntities[i].link).split('/');
        let linkToCall = linkSplitted[0] + '/' + linkSplitted[1] + '/' + linkSplitted[2];

        this.displayTable = this.pageEntities[i].link.includes('/users/');        
        this.restService.call(linkToCall).subscribe(result => {
          
            let user_home_library = '';

            result.user_statistic.forEach(user_statistic => {
              if (typeof user_statistic.category_type !== 'undefined' && user_statistic.category_type.value == 'Home Library') {
                user_home_library = user_statistic.statistic_category.desc;
              }
            });
            
            let myObj = {
              first_name: result.first_name,
              last_name: result.last_name,
              home_library: user_home_library
            };
            this.pageEntities[i]['myObj'] = myObj;
            
          },
          msg => {
            let myObj = {
              first_name: 'ERROR',
              last_name: 'ERROR',
              home_library: 'ERROR'
            };
            this.pageEntities[i]['myObj'] = myObj;
          }
        );
      }

      

      
    }

  }

  update(value: any) {
    this.loading = true;
    let requestBody = this.tryParseJson(value);
    if (!requestBody) {
      this.loading = false;
      return this.toastr.error('Failed to parse json');
    }
    this.sendUpdateRequest(requestBody);
  }

  refreshPage = () => {
    this.loading = true;
    this.eventsService.refreshPage().subscribe({
      next: () => this.toastr.success('Success!'),
      error: e => {
        console.error(e);
        this.toastr.error('Failed to refresh page');
      },
      complete: () => this.loading = false
    });
  }

  private sendUpdateRequest(requestBody: any) {
    let request: Request = {
      url: this.pageEntities[0].link,
      method: HttpMethod.PUT,
      requestBody
    };
    this.restService.call(request).subscribe({
      next: result => {
        this.apiResult = result;
        this.refreshPage();
      },
      error: (e: RestErrorResponse) => {
        this.toastr.error('Failed to update data');
        console.error(e);
        this.loading = false;
      }
    });
  }

  private tryParseJson(value: any) {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error(e);
    }
    return undefined;
  }

}
