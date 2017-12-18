var APP_VIEWS = require('../../app/Login/appViewsConstant');

module.exports = function($scope, authService,APP_VIEWS) {
  'use strict';
  $scope.gauth = function(){
      authService.loginWithGoogle(true);
      authService.view = APP_VIEWS.homeView;
      $scope.$emit('view', authService.view);
  };
};
