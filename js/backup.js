(function () {
    var app = angular.module('app', [
        'ngResource',
        'ui.router',
        'ace',
        'google.plus.auth',
        'ngCookies'
//        'service',
//        'controller'
    ]);
//    app.run(function ($http) {
//        $http.defaults.headers.common['auth-token'] = '59F1D46E-DC52-11E1-A9DD-B6EE6188709B';
//    });
    app.config(function ($stateProvider, $urlRouterProvider, googlePlusAuthProvider) {
        $urlRouterProvider.otherwise('/home');
        $stateProvider.state('home', {
            url: '/home',
            templateUrl: 'views/home.html',
            controller: 'homeCtrl'
        }).state('create', {
            url: '/create',
            templateUrl: 'views/create.html',
            controller: 'createCtrl'
//            resolve: {
//                res: function ($state, auth, ls, $timeout) {
//                    if (ls.get('callback') === undefined) {
//                        $state.go('home');
//                    }
//                }
//            }
        });
        googlePlusAuthProvider.config({
            clientId: '975550590489-ss5if4v25bktvb9h8s4uhgfhu8l8moep.apps.googleusercontent.com'
        });

    });

    app.run(function ($rootScope, $state, ls) {
        $rootScope.$on('$stateChangeStart', function (e, toState) {
            var isLogin = toState.name === "home";
            if (isLogin) {
                return;
            }
            var callback = ls.get('callback');
            if (callback === undefined) {
                e.preventDefault();
                $state.go('home');
            }
        });
    });

    app.factory('auth', function ($http, ls) {
        return {
            createDir: function (data) {
                $http({
                    method: 'POST',
                    url: 'http://localhost/json-restful/public_html/api/createDir',
                    data: data
                });
            },
            createDatabase: function (data) {
                $http({
                    method: 'POST',
                    url: 'http://localhost/json-restful/public_html/api/createDatabase',
                    data: data
                }).then(function () {
                    data.fileDatabase = null;
                    alert('Success Save Database');
                }, function (err) {
                    alert('Error Save Database, File exist' + err);
                });
            },
            createTable: function (data) {
                $http({
                    method: 'POST',
                    url: 'http://localhost/json-restful/public_html/api/createTable',
                    data: data
                }).then(function () {
                    data.fileDatabase = null;
                    alert('Success Create Table');
                }, function (err) {
                    alert('Error Create Table, File exist' + err);
                });
            },
            save: function (data) {
                $http({
                    method: 'POST',
                    url: 'http://localhost/json-restful/public_html/api/auth',
                    data: data
                });
            },
            put: function (data, id) {
                $http({
                    method: 'PUT',
                    url: 'http://localhost/json-restful/public_html/api/auth/' + id,
                    data: data
                });
            },
            deleteDatabase: function (data) {
                $http({
                    method: 'POST',
                    url: 'http://localhost/json-restful/public_html/api/deleteDatabase',
                    data: data
                }).then(function () {
                    alert('Success Delete Database');
                }, function (err) {
                    alert('Error Delete Database, json error' + err);
                });
            },
            deleteDir: function (data) {
                $http({
                    method: 'POST',
                    url: 'http://localhost/json-restful/public_html/api/deleteDir',
                    data: data
                }).then(function () {
                    alert('Success Delete Database');
                }, function (err) {
                    alert('Error Delete Database, json error' + err);
                });
            },
            select: function (id) {
                return $http.get("http://localhost/json-restful/public_html/api/auth/" + id);
            },
            getDatabase: function (id) {
                return $http.get("http://localhost/json-restful/public_html/api/scanDatabase/" + id);
            },
            isLogged: function (id) {
                return $http.get("http://localhost/json-restful/public_html/api/log/" + id);
            }
        };
    });

    app.factory('ls', ['$cookies', function ($cookies) {
            return {
                set: function (key, value) {
                    $cookies.put(key, value);
                },
                get: function (key) {
                    return $cookies.get(key);
                },
                remove: function (key) {
                    $cookies.remove(key);
                }
            };
        }]);
    app.controller('homeCtrl', function ($timeout, $window, $scope, $state, auth, googlePlusAuth, ls) {
        $scope.login = function () {
            googlePlusAuth.login().then(function (res) {
                ls.set('callback', res.profile.id);
                $state.go('create');
                auth.select(res.profile.id).then(function (v) {
                    if (v.data.length === 0) {
                        var post = new Object();
                        post.id = res.profile.id;
                        post.email = res.profile.email;
                        post.name = res.profile.name;
                        post.logged = res.loggedIn;
                        post.link = res.profile.link;
                        post.link_picture = res.profile.picture;
                        auth.save(post);
                        $timeout(function () {
                            var create = new Object();
                            create.fileName = res.profile.id;
                            auth.createDir(create);
                        }, 1000);
                    } else {
                        var put = new Object();
                        put.logged = res.loggedIn;
                        put.id = res.profile.id;
                        auth.put(put, put.id);
                    }
                });
            });
        };
    });
    app.controller('createCtrl', function ($cookies, $timeout, googlePlusUser, $scope, googlePlusAuth, $state, auth, ls) {
        getUser();
        getDatabase();
        $scope.modelCreateDatabase = {
            fileName: ls.get('callback'),
            fileDatabase: null
        };

        $scope.modelCreateTable = {
            fileName: ls.get('callback'),
            fileDatabase: null,
            table: null,
            json: null
        };

        $scope.createDatabase = function () {
            auth.createDatabase($scope.modelCreateDatabase);
            getDatabase();
        };

        $scope.deleteDatabase = function (data) {
            var r = confirm("Are you sure delete database ? ");
            if (r === true) {
                auth.deleteDir({fileName: ls.get('callback'), fileDatabase: data.name});
                getDatabase();
                

            } else {
                getDatabase();
            }
        };

        function getUser() {
            $timeout(function () {
                auth.select(ls.get('callback')).then(function (v) {
                    $scope.data = v.data;
                });
            }, 2000);

        }
        function getDatabase() {
            $timeout(function () {
                auth.getDatabase(ls.get('callback')).then(function (v) {
                    $scope.database = v.data;
                });
            }, 1000);

        }
        $scope.logout = function () {
            googlePlusAuth.logout();
            ls.remove('callback');
            $timeout(function () {
                $state.go('home');
            }, 3000);

        };

        $scope.click = function (data) {
            $scope.name = data.name;
            $scope.modelCreateTable.fileDatabase = data.name;
        };

        $scope.createTable = function () {
            auth.createTable($scope.modelCreateTable);
        };

    });
})();

