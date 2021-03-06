/*
 * Copyright 2017 ThoughtWorks, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define(['models/shared/version_updater'], function (VersionUpdater) {
  describe("VersionUpdater", function () {
    describe('update', function() {
      beforeEach(function () {
        localStorage.clear();
      });

      it('should fetch the stale version info', function () {
        jasmine.Ajax.withMock(function () {
          jasmine.Ajax.stubRequest('/go/api/version_infos/stale', undefined, 'GET').andReturn({
            responseText: {},
            status: 200
          });

          var thirtyOneMinutesBack = new Date(Date.now() - 31 * 60 * 1000);

          localStorage.setItem('versionCheckInfo', JSON.stringify({last_updated_at: thirtyOneMinutesBack})); //eslint-disable-line camelcase

          new VersionUpdater().update();

          var request = jasmine.Ajax.requests.mostRecent();

          expect(request.method).toBe('GET');
          expect(request.url).toBe('/go/api/version_infos/stale');
          expect(request.requestHeaders['Content-Type']).toContain('application/json');
          expect(request.requestHeaders['Accept']).toContain('application/vnd.go.cd.v1+json');
        });
      });

      it('should skip updates if update tried in last half hour', function() {
        jasmine.Ajax.withMock(function () {
          var twentyNineMinutesBack = new Date(Date.now() - 29 * 60 * 1000);

          localStorage.setItem('versionCheckInfo', JSON.stringify({last_updated_at: twentyNineMinutesBack})); //eslint-disable-line camelcase

          new VersionUpdater().update();

          expect(jasmine.Ajax.requests.count()).toBe(0);
        });
      });

      it('should skip updates in absence of stale version info and update local storage with last update time', function () {
        jasmine.Ajax.withMock(function () {
          jasmine.Ajax.stubRequest('/go/api/version_infos/stale', undefined, 'GET').andReturn({
            responseText: {},
            status:       200
          });

          var myDate = jasmine.createSpyObj('Date', ['getTime']);

          spyOn(window, 'Date').and.returnValue(myDate);

          myDate.getTime.and.callFake(function () {
            return 123;
          });

          new VersionUpdater().update();

          expect(jasmine.Ajax.requests.count()).toBe(1);
          expect(localStorage.getItem('versionCheckInfo')).toEqual('{"last_updated_at":123}');
        });
      });

      it('should fetch latest version info if can update', function () {
        jasmine.Ajax.withMock(function () {
          jasmine.Ajax.stubRequest('/go/api/version_infos/stale', undefined, 'GET').andReturn({
            responseText: JSON.stringify({'update_server_url': 'update.server.url'}),
            status:       200
          });

          jasmine.Ajax.stubRequest('update.server.url', undefined, 'GET').andReturn({
            responseText: {},
            status:       200
          });

          new VersionUpdater().update();

          var request = jasmine.Ajax.requests.at(1);

          expect(request.method).toBe('GET');
          expect(request.url).toBe('update.server.url');
          expect(request.requestHeaders['Accept']).toContain('application/vnd.update.go.cd.v1+json');
        });
      });

      it('should post the latest version info to server', function () {
        jasmine.Ajax.withMock(function () {
          jasmine.Ajax.stubRequest('/go/api/version_infos/stale', undefined, 'GET').andReturn({
            responseText: JSON.stringify({'update_server_url': 'update.server.url'}),
            status:       200
          });

          jasmine.Ajax.stubRequest('update.server.url', undefined, 'GET').andReturn({
            responseText: JSON.stringify({foo: 'bar'}),
            status:       200
          });

          jasmine.Ajax.stubRequest('/go/api/version_infos/go_server', undefined, 'PATCH').andReturn({
            responseText: {},
            status:       200
          });

          var myDate = jasmine.createSpyObj('Date', ['getTime']);

          spyOn(window, 'Date').and.returnValue(myDate);

          myDate.getTime.and.callFake(function () {
            return 123;
          });

          new VersionUpdater().update();

          var request = jasmine.Ajax.requests.at(2);

          expect(request.method).toBe('PATCH');
          expect(request.url).toBe('/go/api/version_infos/go_server');
          expect(JSON.parse(request.params)).toEqual({foo: 'bar'});
          expect(request.requestHeaders['Content-Type']).toContain('application/json');
          expect(request.requestHeaders['Accept']).toContain('application/vnd.go.cd.v1+json');
          expect(localStorage.getItem('versionCheckInfo')).toEqual('{"last_updated_at":123}');
        });
      });
    });
  });
});