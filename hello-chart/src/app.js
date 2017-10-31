/* eslint-env browser */
/* eslint import/no-unresolved:0, import/extensions:0 */
/* eslint no-bitwise:0 */

import Halyard from 'halyard.js';
import angular from 'angular';
import enigma from 'enigma.js';
import enigmaMixin from 'halyard.js/dist/halyard-enigma-mixin';
import qixSchema from 'json-loader!../node_modules/enigma.js/schemas/3.2.json';
import template from 'raw-loader!./app.html';
import Scatterplot from './scatterplot';

const halyard = new Halyard();

angular.module('app', []).component('app', {
  bindings: {},
  controller: ['$scope', '$q', '$http', function Controller($scope, $q, $http) {
    $scope.dataSelected = false;
    $scope.showInfo = false;

    $scope.toggleFooter = () => {
      if ($scope.dataSelected) {
        this.clearAllSelections();
      } else {
        $scope.dataSelected = true;
      }
    };

    $scope.openGithub = () => {
      window.open('https://github.com/qlik-ea/qlik-elastic-tutorial');
    };

    this.connected = false;
    this.painted = false;
    this.connecting = true;

    let object = null;
    let app = null;

    const select = async (value) => {
      const field = await app.getField('Movie');
      await field.select(value);
      this.getMovieInfo();
    };

    const scatterplot = new Scatterplot(select);

    const paintChart = (layout) => {
      scatterplot.paintScatterplot(document.getElementById('chart-container'), layout, select);
      this.painted = true;
    };

    this.generateGUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : ((r & 0x3) | 0x8);
      return v.toString(16);
    });

    this.$onInit = async () => {
      const config = {
        Promise: $q,
        schema: qixSchema,
        mixins: enigmaMixin,
        url: `ws://localhost:9076/${this.generateGUID()}`,
      };

      // Add local data
      const filePathMovie = '/data/movies.csv';
      const tableMovie = new Halyard.Table(filePathMovie, {
        name: 'Movies',
        fields: [{ src: 'Movie', name: 'Movie' }, { src: 'Year', name: 'Year' },
          { src: 'Adjusted Costs', name: 'Adjusted Costs' }, { src: 'Description', name: 'Description' }, { src: 'Image', name: 'Image' }],
        delimiter: ',',
      });
      halyard.addTable(tableMovie);

      // Add web data
      const data = await $http.get('https://gist.githubusercontent.com/carlioth/b86ede12e75b5756c9f34c0d65a22bb3/raw/e733b74c7c1c5494669b36893a31de5427b7b4fc/MovieInfo.csv');
      const table = new Halyard.Table(data.data, { name: 'MoviesInfo', delimiter: ';', characterSet: 'utf8' });
      await halyard.addTable(table);
      try {
        const global = await enigma.create(config).open();
        this.connected = true;
        this.connecting = false;
        const result = await global.createSessionAppUsingHalyard(halyard);
        // have two try catches? check the values on the error?
        app = result;
        await result.getAppLayout();
        const scatterplotProperties = {
          qInfo: {
            qType: 'visualization',
            qId: '',
          },
          type: 'my-d3-scatterplot',
          labels: true,
          qHyperCubeDef: {
            qDimensions: [{
              qDef: {
                qFieldDefs: ['Movie'],
                qSortCriterias: [{
                  qSortByAscii: 1,
                }],
              },
            }],
            qMeasures: [{
              qDef: {
                qDef: '[Adjusted Costs]',
                qLabel: 'Adjusted cost ($)',
              },
              qSortBy: {
                qSortByNumeric: -1,
              },
            },
            {
              qDef: {
                qDef: '[imdbRating]',
                qLabel: 'imdb rating',
              },
            }],
            qInitialDataFetch: [{
              qTop: 0, qHeight: 50, qLeft: 0, qWidth: 3,
            }],
            qSuppressZero: false,
            qSuppressMissing: true,
          },
        };
        const model = await result.createSessionObject(scatterplotProperties);
        object = model;
        const update = async () => {
          const layout = await object.getLayout();
          paintChart(layout);
        };
        object.on('changed', update);
        update();
      } catch (error) {
        this.error = 'Could not connect to QIX Engine or create the session app';
        this.connecting = false;
        this.connected = false;
      }
    };

    this.clearAllSelections = () => {
      if ($scope.dataSelected) {
        $scope.showInfo = false;
        $scope.dataSelected = false;
        app.clearAll();
      }
    };

    this.getMovieInfo = async () => {
      console.log("here?");
      const tableProperties = {
        qInfo: {
          qType: 'visualization',
          qId: '',
        },
        type: 'my-d3-table',
        labels: true,
        qHyperCubeDef: {
          qDimensions: [{
            qDef: {
              qFieldDefs: ['Movie'],
            },
          },
          {
            qDef: {
              qFieldDefs: ['Image'],
            },
          },
          {
            qDef: {
              qFieldDefs: ['Year'],
            },
          },
          {
            qDef: {
              qFieldDefs: ['Genre'],
            },
          },
          {
            qDef: {
              qFieldDefs: ['Description'],
            },
          },
          ],
          qInitialDataFetch: [{
            qTop: 0, qHeight: 50, qLeft: 0, qWidth: 50,
          }],
          qSuppressZero: false,
          qSuppressMissing: true,
        },
      };
      const model = await app.createSessionObject(tableProperties);
      const layout = await model.getLayout();
      $scope.dataSelected = true;
      $scope.showInfo = true;
      scatterplot.showDetails(layout);
      if ($scope.dataSelected) {
        this.clearAllSelections();
      } else {
        $scope.dataSelected = true;
        $scope.showInfo = true;
        scatterplot.showDetails(layout);
      }
    };
  }],
  template,
});

angular.bootstrap(document, ['app']);
