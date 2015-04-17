angular.module('stapp', ['ionic','stapp.controllers', 'ngCordova'])

.config(function($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise('/login');
	
  $stateProvider
  	.state('index', {
      url: "/index",
      templateUrl: 'templates/map.html',
      controller: 'MapCtrl'
  })
  .state('question', {
      url: "/question",
      templateUrl: "templates/question.html",
      controller: 'QuestionCtrl'     
  })
    .state('login', {
      url: "/login",
      templateUrl: "templates/login.html", 
  })
});