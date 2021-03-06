import { Component } from 'angular2/core';
import { CORE_DIRECTIVES, FORM_DIRECTIVES } from 'angular2/common';
import { Observable } from 'rxjs/Rx';

import { Router, RouteParams, ROUTER_DIRECTIVES } from 'angular2/router';

import { Client, Upload } from '../../services/api';
import { MindsTitle } from '../../services/ux/title';
import { Navigation as NavigationService } from '../../services/navigation';
import { Material } from '../../directives/material';
import { InfiniteScroll } from '../../directives/infinite-scroll';
import { Poster } from './poster/poster';
import { CARDS } from '../../controllers/cards/cards';
import { MindsActivityObject } from '../../interfaces/entities';
import { SessionFactory } from '../../services/session';
import { BoostAds } from '../../components/ads/boost';

import { AnalyticsImpressions } from '../../components/analytics/impressions';
import { NewsfeedBoostRotator } from './boost-rotator/boost-rotator';


@Component({
  selector: 'minds-newsfeed',
  bindings: [ MindsTitle, NavigationService ],
  templateUrl: 'src/controllers/newsfeed/list.html',
  directives: [ Poster, Material, CORE_DIRECTIVES, FORM_DIRECTIVES, ROUTER_DIRECTIVES,
    InfiniteScroll, AnalyticsImpressions, CARDS, BoostAds, NewsfeedBoostRotator ]
})

export class Newsfeed {

  newsfeed : Array<Object>;
  prepended : Array<any> = [];
  offset : string = "";
  inProgress : boolean = false;
  moreData : boolean = true;
  session = SessionFactory.build();
  minds;

  attachment_preview;

  message : string = "";
  newUserPromo : boolean = false;
  postMeta : any = {
    title: "",
    description: "",
    thumbnail: "",
    url: "",
    active: false,
    attachment_guid: null
  }

  constructor(public client: Client, public upload: Upload, public navigation : NavigationService,
    public router: Router, public params: RouteParams, public title: MindsTitle){
    if(!this.session.isLoggedIn()){
      router.navigate(['/Login']);
    } else {
      this.load();
      this.minds = window.Minds;
    }

    if(params.params['message']){
      this.message = params.params['message'];
    }
    if(params.params['newUser']){
      this.newUserPromo = Boolean(params.params['newUser']);
    }


    this.title.setTitle("Newsfeed");
  }

  /**
   * Load newsfeed
   */
  load(refresh : boolean = false){
    var self = this;
    if(this.inProgress){
      //console.log('already loading more..');
      return false;
    }

    if(refresh){
      this.offset = "";
    }

    this.inProgress = true;

    this.client.get('api/v1/newsfeed', {limit:12, offset: this.offset}, {cache: true})
        .then((data : MindsActivityObject) => {
          if(!data.activity){
            self.moreData = false;
            self.inProgress = false;
            return false;
          }
          if(self.newsfeed && !refresh){
            self.newsfeed = self.newsfeed.concat(data.activity);
          } else {
            self.newsfeed = data.activity;
          }
          self.offset = data['load-next'];
          self.inProgress = false;
        })
        .catch(function(e){
          self.inProgress = false;
        });
  }

  prepend(activity : any){
    if(this.newUserPromo){
      this.autoBoost(activity);
      activity.boostToggle = false;
      activity.boosted = true;
    }
    this.prepended.unshift(activity);
    this.newUserPromo = false;
  }

  autoBoost(activity : any){
    this.client.post( 'api/v1/boost/activity/' + activity.guid + '/' + activity.owner_guid,
      {
        newUserPromo: true,
        impressions: 200,
        destination: 'Newsfeed'
      });
  }

  delete(activity){
    for(var i in this.newsfeed){
      if(this.newsfeed[i] == activity)
        this.newsfeed.splice(i,1);
    }
  }
}

export { NewsfeedSingle } from './single/single';
