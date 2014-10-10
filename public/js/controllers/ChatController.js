'use strict';
/**
 * The controller for the ap-chat directive.
 */
exports = module.exports = [
    '$log',
    '$rootScope',
    '$scope',
    '$timeout',

    'Account',
    'Message',
    'File',
    'paddTopScroll',
    'moment',
    'renderFile',

    function ($log, $rootScope, $scope, $timeout, Account, Message, File, paddTopScroll, moment, renderFile) {
        $scope.pendingUploads = 0;

        $scope.sendMessage = function (txt, fileId) {
            $log.debug('sendMessage', txt);
            if (!txt) {
                return;
            }
            var msg = {
                content: txt
            };
            // is it a private message?
            if ($scope.selectedChat.display) {
                msg.to = $scope.selectedChat._id;
                // indicate the recipient was not online and needs to be notified
                if ($scope.selectedChat.presence === 'unavailable') {
                    msg.recipientOffline = true;
                }
            }
            // or a group message
            else {
                msg.group = $scope.selectedChat._id;
            }
            if (fileId) {
                msg.file = fileId;
            }
            $scope.selectedChat.messages.push({
                content: txt,
                from: $rootScope.account,
                created: new Date()
            });
            Message.create(msg, function (err, sentMessage) {
                if (err) {
                    $rootScope.notifications.push(err);
                    $scope.selectedChat.messages.pop();
                    return;
                }
            });
        };

        $scope.loadBackMessages = function () {
            $log.debug('loadBackMessages', $scope.selectedChat);
            if (!$scope.selectedChat) {
                return;
            }
            if (!$scope.selectedChat.messages.length) {
                return;
            }
            var qs;
            if ($scope.selectedChat.display) {
                qs = '?account=' + $scope.selectedChat._id;
            }
            else {
                qs = '?group=' + $scope.selectedChat._id;
            }
            qs += '&before=' + encodeURIComponent($scope.selectedChat.messages[0].created);
            qs += '&limit=20';

            Message.get(qs, function (err, messages) {
                if (err) {
                    $rootScope.notifications.push(err);
                    return;
                }
                if (!messages.length) {
                    return;
                }
                // Messages are sorted descending from the server, to capture
                // the latest ones. So to get the most recent on the bottom, 
                // the array gets reversed.
                messages.reverse();
                $scope.selectedChat.messages = messages.concat($scope.selectedChat.messages);
                $timeout(function () {
                    paddTopScroll(20);
                });
            });
        };

        $scope.onDropUpload = function (files) {
            if ($scope.pendingUploads) {
                $rootScope.notifications.push('Wait for uploads to finish.');
                return;
            }
            $log.debug('drag and drop ', files.length, 'files');
            files.forEach(function (data) {
                $log.debug(data.name, data.contentType);
                $scope.pendingUploads++;
                File.create({
                    contentType: data.contentType,
                    content: data.content,
                    name: data.name
                }, onAfterUpload);
            });
        };

        $scope.onPasteUpload = function (data) {
            $log.debug('paste upload', data.contentType);
            if ($scope.pendingUploads) {
                $rootScope.notifications.push('Wait for uploads to finish.');
                return;
            }
            $scope.pendingUploads++;
            File.create({
                contentType: data.contentType,
                content: data.content
            }, onAfterUpload);
        };

        function onAfterUpload(err, file) {
            $scope.pendingUploads--;
            if (err) {
                $rootScope.notifications.push(err);
                return;
            }
            
            renderFile(file, function (err, messageText) {
                if (err) {
                    $rootScope.notifications.push(err);
                    return;
                }
                $scope.sendMessage(messageText, file._id);
            });
        }

    }
];
