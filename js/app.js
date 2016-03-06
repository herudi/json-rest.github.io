(function () {
    var app = angular.module('app', [
        'ngResource',
        'ui.router',
        'ace',
        'google.plus.auth',
        'ngCookies',
        'xc.indexedDB'
    ]);
    app.config(function ($stateProvider, $urlRouterProvider, googlePlusAuthProvider, $indexedDBProvider) {
        $urlRouterProvider.otherwise('/home');
        $stateProvider.state('home', {
            url: '/home',
            templateUrl: 'views/home.html',
            controller: 'homeCtrl'
        }).state('create', {
            url: '/create',
            templateUrl: 'views/create.html',
            controller: 'createCtrl'
        });
        googlePlusAuthProvider.config({
            clientId: '975550590489-ss5if4v25bktvb9h8s4uhgfhu8l8moep.apps.googleusercontent.com'
        });
        $indexedDBProvider.connection('myIndexedDB').upgradeDatabase(2, function (event, db, tx) {
            var objStore = db.createObjectStore('user', {keyPath: 'id'});
            objStore.createIndex('email_idx', 'email', {unique: false});
            objStore.createIndex('name_idx', 'name', {unique: false});
            objStore.createIndex('logged_idx', 'logged', {unique: false});
            objStore.createIndex('link_idx', 'link', {unique: false});
            objStore.createIndex('linkPictre_idx', 'link_picture', {unique: false});
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
        var baseUrl = "http://data-json.gdk.mx/api/";
        return {
            createDir: function (data) {
                $http({
                    method: 'POST',
                    url: baseUrl + 'createDir',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    data: data
                });
            },
            createDatabase: function (data) {
                $http({
                    method: 'POST',
                    url: baseUrl + 'createDatabase',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
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
                    url: baseUrl + 'createTable',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    data: data
                }).then(function () {
                    data.table = null;
                    data.json = null;
                    alert('Success Create Table');
                }, function (err) {
                    alert('Error Create Table, File exist' + err);
                });
            },
            deleteDir: function (data) {
                $http({
                    method: 'POST',
                    url: baseUrl + 'deleteDir',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    data: data
                }).then(function () {
                    alert('Success Delete Database');
                }, function (err) {
                    alert('Error Delete Database, json error' + err);
                });
            },
            deleteDirTable: function (data) {
                $http({
                    method: 'POST',
                    url: baseUrl + 'deleteDirTable',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    data: data
                }).then(function () {
                    alert('Success Delete Table');
                }, function (err) {
                    alert('Error Delete Table, json error' + err);
                });
            },
            getDatabase: function (id) {
                return $http.get(baseUrl + "scanDatabase/" + id);
            },
            getTable: function (a, b) {
                return $http.get(baseUrl + "scanTable/" + a + "/" + b);
            },
            getTableJson: function (a, b, c) {
                return $http.get(baseUrl + "user/" + a + "/" + b + "/" + c + "/" + c + ".json");
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
    app.controller('homeCtrl', function ($timeout, $indexedDB, $scope, $state, auth, googlePlusAuth, ls) {
        var myObjectStore = $indexedDB.objectStore('user');
        $scope.login = function () {
            googlePlusAuth.login().then(function (res) {
                ls.set('callback', res.profile.id);
                var post = new Object();
                post.id = res.profile.id;
                post.email = res.profile.email;
                post.name = res.profile.name;
                post.logged = res.loggedIn;
                post.link = res.profile.link;
                post.link_picture = res.profile.picture;
                myObjectStore.insert(post).then(function (){
                    var create = new Object();
                    create.fileName = res.profile.id;
                    auth.createDir(create);
                    $state.go('create');
                });
                
            });
        };
    });
    app.controller('createCtrl', function ($indexedDB, $timeout, googlePlusUser, $scope, googlePlusAuth, $state, auth, ls) {
        var myObjectStore = $indexedDB.objectStore('user');
        getUser();
        getDatabase();
        $scope.json = null;
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
        function findAndReplace(object, value, replacevalue) {
            for (var x in object) {
                if (typeof object[x] === typeof {}) {
                    findAndReplace(object[x], value, replacevalue);
                }
                if (object[x] === value) {
                    object[x] = replacevalue;
                }
            }
        }


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

        $scope.deleteTable = function (data) {
            var r = confirm("Are you sure delete tablle ? ");
            if (r === true) {
                auth.deleteDirTable({fileName: ls.get('callback'), fileDatabase: $scope.name, fileTable: data.name});
                $timeout(function () {
                    auth.getTable(ls.get('callback'), $scope.name).then(function (v) {
                        $scope.table = v.data;
                    });
                }, 1000);
            }
        };

        function getUser() {
            $timeout(function () {
                myObjectStore.getAll().then(function (results) {
                    $scope.data = results;
                });
            }, 500);

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
            myObjectStore.clear();
            $timeout(function () {
                $state.go('home');
            }, 3000);

        };

        $scope.click = function (data) {
            $scope.name = data.name;
            $scope.modelCreateTable.fileDatabase = data.name;
            $timeout(function () {
                auth.getTable(ls.get('callback'), data.name).then(function (v) {
                    $scope.table = v.data;
                });
            }, 1000);
        };

        $scope.clickView = function (data) {
            auth.getTableJson(ls.get('callback'), $scope.name, data.name).then(function (v) {
                $scope.tableJson = JSON.stringify(v.data, null, "\t");
            });
        };

        $scope.createTable = function () {
            if ($scope.modelCreateTable.table === null || $scope.modelCreateTable.table === '') {
                alert('please fill table name');
            } else if ($scope.json === null || $scope.json === '') {
                alert('please fill json');
            } else if ($scope.json.length < 11) {
                alert('error json');
            } else {
                try {
                    var a = JSON.parse($scope.json);
                    angular.forEach(a, function (value, key) {
                        if (value !== "string" && value !== "integer") {
                            findAndReplace(a, value, 'string');
                        }
                    });
                    $scope.modelCreateTable.json = JSON.stringify(a);
                    auth.createTable($scope.modelCreateTable);
                    $timeout(function () {

                        auth.getTable(ls.get('callback'), $scope.name).then(function (v) {
                            $scope.table = v.data;
                        });
                    }, 1000);
                    $scope.json = null;
                } catch (err) {
                    alert(err + " Please fill in with the correct json");
                    $scope.json = null;
                }

            }
        };

    });
})();

