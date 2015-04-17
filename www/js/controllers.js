var myApp = angular.module('stapp.controllers', [ 'ui.router', 'ngCordova', 'ionic' ]);
var myPopup;
var qrcode; // = 'b36';
var qrcodes = [] // = ["1x9","87t","b36","s5t","wr2","pqr","f63","4lc"]; //Dit wordt gebruikt bij de QuestionCtrl
var ok = []; //Nodig voor de punten te bepalen bij QuestionCtrl
var nok = []; //Nodig voor de punten te bepalen bij QuestionCtrl
var jsonarr = []; //array voor data bij te houden
var markers = [];
var start; //voor routes
var end;
var startTime; // = 10000; //testing
var tracker; //where am i
var infowindows = [];
var gpsinterval; // this var stores the gps update interval function
var index =1;

function makeInfoWindowEvent(map, infowindow, marker){
	return function(){
		google.maps.event.addListener(infowindow, 'domready', function(){
			$(".gm-style-iw").next("div").hide();
		});
		killBoxes();
		infowindow.open(map, marker);
	};
}
function killBoxes(){
	for(var i = 0; i < infowindows.length; i++ ){ 
		infowindows[i].close();
	}
}
function convertImgToBase64URL(url, callback, outputFormat){
    var canvas = document.createElement('CANVAS'),
        ctx = canvas.getContext('2d'),
        img = new Image;
    	img.crossOrigin = 'Anonymous';
    	img.onload = function(){
        	var dataURL;
        	canvas.height = img.height;
        	canvas.width = img.width;
        	ctx.drawImage(img, 0, 0);
        	dataURL = canvas.toDataURL(outputFormat);
        	callback.call(this, dataURL);
        	canvas = null; 
    	};
    img.src = url;
}

myApp.controller('MapCtrl',
		function($scope, $ionicModal, $ionicLoading, $http, $ionicPopup, $ionicPopover,
				$cordovaBarcodeScanner, $state, $ionicPlatform, $cordovaCamera) {

			$ionicPlatform.registerBackButtonAction(function (event){
				clearInterval(gpsinterval);
				ionic.Platform.exitApp();
			}, 10000);

			$ionicModal.fromTemplateUrl('templates/image-modal.html', function($ionicModal) {
				$scope.modal = $ionicModal;
			}, {    
				scope: $scope,    
				animation: 'slide-in-up'
			});

			$scope.openModal = function() {
				$scope.modal.show();
			};

			$scope.closeModal = function() {
				$scope.modal.hide();
			};

			$scope.$on('$destroy', function() {
				$scope.modal.remove();
			});

			$scope.$on('modal.hide', function() {
				$scope.modal.remove();
			});

			$scope.showImage = function() {
				switch(index) {
				case 1:
					$scope.imageSrc = 'img/img1.png';
					index++;
					$scope.openModal();
					break;
				case 2:
					$scope.imageSrc  = 'img/img2.png';
					index++;
					$scope.openModal();
					break;
				case 3:
					$scope.imageSrc  = 'img/img3.png';
					index++;
					break;
				case 4:
					$scope.closeModal();
					break;
				case 5:
					$scope.imageSrc  = 'img/img4.png';
					index++;
					$scope.openModal();
					break;
				case 6:
					$scope.closeModal();
					break;
				case 7:
					$scope.imageSrc  = 'img/img5.png';
					index++;
					$scope.openModal();
					break;
				case 8:
					$scope.closeModal();
					break;
				}
			}
			tracker = undefined;
			showspinner();
			loadQuestions();
			initialize();
			progress();
			if(localStorage.getItem('logins') != null) {
				//console.log(localStorage.getItem('logins'));
			} 
			else{ 
				$state.go('login');
			}
			function loadQuestions() {
				if(localStorage['qrcodes'] == null){					
					localStorage['qrcodes'] = JSON.stringify(qrcodes);
					localStorage['firstrun'] = 'ja';
					localStorage['questionOk'] = JSON.stringify(ok);
					localStorage['questionNok'] = JSON.stringify(ok);	
				}
				$http.jsonp('https://stapp.cloudant.com/ap/_design/views/_view/questions?callback=JSON_CALLBACK')
				.then(function(resp) {
							window.localStorage['questions'] = JSON.stringify(resp.data.rows);
						}, function(err) {
					});
			}
			function initialize(){
				directionsDisplay = new google.maps.DirectionsRenderer({polylineOptions: {
					strokeColor: 'red',
					strokeOpacity:0.5,
					strokeWeight: 6
				},suppressMarkers: true});
				if(window.localStorage['questions'] == null) {
					setTimeout(function() {
						initialize();
					}, 200);
				} 
				else {
					var myLatlng = new google.maps.LatLng(51.216126, 4.410546);
					var mapOptions = {
						center : myLatlng,
						zoom : 16,
						mapTypeId : google.maps.MapTypeId.ROADMAP,
					};
					var map = new google.maps.Map(document.getElementById('map'), mapOptions);
					jsonarr = JSON.parse(window.localStorage['questions']);
					for(i = 0; i<jsonarr.length; i++){
						var spot = jsonarr[i];
						var myLatLng = new google.maps.LatLng(spot.value.lat, spot.value.lon);
						var marker = new google.maps.Marker({
							map : map,
							position : myLatLng,
							title : spot.value.hotspot,
							id: spot.value.qrCode,
							icon: 'img/marker.png'
						});
						var infowindow = new google.maps.InfoWindow({
							content : spot.value.hotspot + '<br>' + spot.value.adres
						});
						infowindows.push(infowindow);
						marker.setMap(map);
						google.maps.event.addListener(marker, 'click', makeInfoWindowEvent(map, infowindow, marker));
						markers.push(marker);
					}
					google.maps.event.addListener(map, "click", function(event) {
						killBoxes();
					});
					$scope.map = map;
					google.maps.event.addListenerOnce(map, 'tilesloaded', function() {
						$ionicLoading.hide();
						if(localStorage['firstrun'] == 'ja'){
							$scope.showImage();
							localStorage['firstrun'] = 'nee';
						}
						setGeolocation();
						gpsinterval = window.setInterval(function() {
							setGeolocation();
						}, 
						45000);
					});
				};
				directionsDisplay.setMap(map);
			}
			var directionsDisplay;
			var directionsService = new google.maps.DirectionsService();
			function calcRoute(start,end) {
				var startje = new google.maps.LatLng(start.k, start.B);
				var endje =  new google.maps.LatLng(end.k, end.B);
				var request = {
						origin:start,
						destination:end,
						travelMode: google.maps.TravelMode.WALKING
				};
				directionsService.route(request, function(response, status) {
					if (status == google.maps.DirectionsStatus.OK) {
						directionsDisplay.setDirections(response);
						new google.maps.Marker({
							map: $scope.map,
							position: end,
							icon: 'img/icon/symbol_inter1.png',
							clickable: false
						});
					}
				});
			}
			if (qrcode != null) {			
				if(qrcode=="4z7"){
					index=5;
					setTimeout(function() {$scope.showImage();}, 400);
				}
				if(qrcodes.length != 10){
					for (i = 0; i < markers.length; i++) {
						if(markers[i].id == qrcode){
							start = markers[i].position;
							if(i == (markers.length -1)){
								end = markers[0].position;
							}
							else{
								end = markers[i+1].position;
							}
						}
					}
					calcRoute(start,end);
				}
				else{
					index=7;
					setTimeout(function() {$scope.showImage();}, 400);
					setTimeout(function() {
						calcRoute(end,  new google.maps.LatLng(51.216126, 4.410546)); //directions to school
						localStorage.clear();
						qrcodes.length = 0;
					},100);
				}
			}
			function progress() {
				var progress;
				if (qrcodes.length == 0) {
					progress = 0;					
				}
				else {
					progress = qrcodes.length;
				}
				$scope.progress = progress;
			}
			function showspinner() {
				$ionicLoading.show({
					template : '<i class="icon ion-loading-a"></i>'
				});
			}
			$scope.scanBarcode = function(){
				var found = false;
				$cordovaBarcodeScanner.scan().then(function(imageData){
							var execute = true;
							for (var i = 0; i < qrcodes.length; i++) {
								if (imageData.text == qrcodes[i]) { 
									execute = false;
								}
							}
							if($scope.progress == 10){execute = false;}

							if(execute){
								for (i = 0; i < jsonarr.length; i++) {
									if (imageData.text == jsonarr[i].value.qrCode) {
										qrcode = imageData.text;
										clearInterval(gpsinterval);
										tracker = undefined;
										$state.go('question');
										found = true;
										break;
									}
									if (found == false && i > 8) {
										var alertPopup;
										alertPopup = $ionicPopup.alert({
											title : '<h3>Fout</h3>',
											template:  'Er werd geen QR-code gescand of de gescande QR-code is ongeldig.',
											buttons : [ {
												text : 'OK',
												type : 'button button-assertive'
											} ]
										});
									}
								}
							}
							else {
								alertPopup = $ionicPopup.alert({
									title : '<h3>Fout</h3>',
									template:'Deze QR-code werd al gescand.',
									buttons : [ {
										text : 'OK',
										type : 'button button-assertive'
									}]
								});
							}
						},
						function(error) {
							//console.log("An error happened -> " + error);
						});
			};
			function setGeolocation() {
				navigator.geolocation.getCurrentPosition(function(position) {
      				var myLatlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      				if(tracker == undefined) {
						tracker = new google.maps.Marker(
							{position : myLatlng,
								map : $scope.map,
								zIndex : 1,
								icon : 'img/you-are-here.png'});
						$scope.map.setCenter(myLatlng);
					} 
					else {
						$scope.map.setCenter(myLatlng);
						tracker.setPosition(myLatlng);
					}
    			});
			};
			$scope.takePhoto = function(){
			    var options = {
			    	quality: 50,
			    	destinationType: Camera.DestinationType.FILE_URL,
			    	sourceType: Camera.PictureSourceType.CAMERA,
			    	allowEdit: true,
			    	encodingType: 0,  // jpeg
			    	popoverOptions: CameraPopoverOptions,
			    	saveToPhotoAlbum: true
			    };
			    $cordovaCamera.getPicture(options).then(function(imageData) {
			    	convertImgToBase64URL(imageData, function(base64Img){
			    		localStorage.setItem('image', base64Img);
			    	});
			      }, function(err) {
			        alert(err);
			      });
			}
		});

myApp.controller('QuestionCtrl', function($scope, $ionicPopup, $state, $http) {
	jsonarr = JSON.parse(localStorage['questions']);
	var execute = true;
	var valid = false;
	qrcodes = JSON.parse(localStorage['qrcodes']);
	for(var i=0; i<qrcodes.length; i++){
		if(qrcode == qrcodes[i]){
			execute = false;
		}
	}
	for(var i=0; i<jsonarr.length; i++){
		if(qrcode == jsonarr[i].value.qrCode){
			valid = true;
		}
	}
	if(valid == false){
		alertPopup = $ionicPopup.alert({title: 'U heeft een foute// qrcode gescand', buttons: [{text: 'OK', type: 'button-assertive', onTap : function() {$state.go('index');}}]});
	}
	if(execute){
		var question = {};
		for (var i = 0; i < jsonarr.length; i++) {
			var doc = jsonarr[i].value;
			console.log("docje" + doc);
			if (qrcode == doc.qrCode) {
				question.hotspot = doc.hotspot;
				question.question = doc.question;
				question.image = "img/fotosVragen/" + qrcode + ".png";
				question.allAnswers = doc.allAnswers;
				if (doc.allAnswers != null) {
					//console.log(doc.allAnswers);
					document.getElementById("multi").style.visibility = "visible";
					document.getElementById("open").style.visibility = "hidden";
					question.answer = doc.answer;
				}
				else {
					question.answercheck = doc.answercheck;
				}
			}
		}
		$scope.question = [ {
			"question" : question.question
		} ];
		$scope.hotspot = [ {
			"hotspot" : question.hotspot
		} ];
		$scope.image = [{"image": question.image}];

		if (question.allAnswers != null) {
			$scope.answer = [];
			var possibleAnswer = question.allAnswers.split(";");
			for (var i = 0; i < possibleAnswer.length; i++) {
				$scope.answer.push({
					"items" : possibleAnswer[i]
				})
			}
		}
	}
	else{
		alertPopup = $ionicPopup.alert({title: 'U heeft deze qrcode al gescand', buttons: [{text: 'OK', type: 'button-assertive', onTap : function() {$state.go('index');}}]});
	}

	$scope.validate = function() {
		qrcodes.push(qrcode);
		localStorage['qrcodes'] = JSON.stringify(qrcodes); //storage the filled in question
		ok = JSON.parse(window.localStorage['questionOk']);
		nok = JSON.parse(window.localStorage['questionNok']);
		var answer = $scope.validate.answer;
		var alertPopup;
		console.log(question.answercheck);
		if (answer != null) {
			if (question.allAnswers != null) {
				if (answer == question.answer) {
					console.log("question correct");
					ok.push(qrcode);
					localStorage['questionOk'] = JSON.stringify(ok);
				} 
				else {
					nok.push(qrcode);
					localStorage['questionNok'] = JSON.stringify(nok);
					console.log("question incorrect");
				}
			}
			else {
				var split = [];
				split = question.answercheck.split(";");
				for (var i = 0; i < split.length; i++) {
					console.log(answer + "  " + split[i]);
					if(answer.toLowerCase().indexOf(split[i]) > -1) {
						console.log("question correct");
						ok.push(qrcode);
						localStorage['questionOk'] = JSON.stringify(ok);
					}
				}
			}
			if(qrcodes.length == 1){
				var date = new Date();
				startTime = date.getTime();
				localStorage.setItem('starttime', startTime);
			}
			if(qrcodes.length == 10){
				var date = new Date();
				var endTime = date.getTime();
				startTime = localStorage.getItem('starttime');
				var image = localStorage.getItem('image');
				var difference = endTime-startTime;
				var points = JSON.parse(localStorage['questionOk']).length;
				var login = JSON.parse(localStorage.getItem('logins'));
				var dataObj = {
						team : login.team,
						name : login.name,
						email : login.email,
						time: difference,
						answersOk : localStorage['questionOk'],
						points : points,
						image : image
				};

				$http.post('https://stapp.cloudant.com/results', dataObj);				
				$state.go('index');
			}else{
				alertPopup = $ionicPopup.alert({
					title : '<h3>Succes</h3>',
					template:'Het antwoord is opgeslagen!',
					buttons : [ {
						text : 'OK',
						type : 'button-assertive',
						onTap : function() {
							localStorage.setItem('qrcode', qrcode);
							$state.go('index');
						}
					}]
				});
			}
		} 
		else {
			if (question.allAnswers != null) {
				alertPopup = $ionicPopup.alert({
					title : '<h3>Fout</h3>',
					template: 'Gelieve een antwoord aan te duiden.',
					buttons : [ {
						text : 'OK',
						type : 'button-assertive'
					} ]
				});
			} 
			else {
				alertPopup = $ionicPopup.alert({
					title : '<h3>Fout</h3>',
					template:'Gelieve een antwoord in te vullen.',
					buttons : [ {
						text : 'OK',
						type : 'button-assertive'
					} ]
				});
			}
		}
	}
	$scope.changeState = function() {
		$state.go('question');
	}
})

myApp.controller('LoginCtrl', function($scope, $ionicPopup, $state, $ionicPlatform) {
	$ionicPlatform.registerBackButtonAction(function (event) {  //exits the app when back button is pressed
		ionic.Platform.exitApp();
	}, 100);
	if (localStorage.getItem('logins') != null) {
		if (localStorage.getItem('qrcode') != null)
			qrcode = localStorage.getItem('qrcode'); //load qrcode to calculate route when app crashed/restarted
		if (localStorage.getItem('qrcodes') != null)
			qrcodes = JSON.parse(localStorage['qrcodes']); //load qrcodes to calculate progress when app crashed/restarted
		$state.go('index');
	}
	$scope.options = ['Nederlands','English']; 
	$scope.doLogin = function(){
		if(!$scope.login.team || !$scope.login.name || !$scope.login.email || !$scope.login.checked){
			$scope.showAlert = function() {
				var alertPopup = $ionicPopup.alert({
					title: '<h3>Fout</h3>',
					template:'Controleer alle invoervelden aub.',
					buttons : [ {
						text : 'OK',
						type : 'button-assertive'
					} ]
				});
			}
			$scope.showAlert();
		}
		else{
			localStorage.setItem('logins', JSON.stringify($scope.login));
			$state.go('index');
		}
	};
})