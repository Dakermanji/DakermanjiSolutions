//! public/js/social/state.js

const notificationsCollapse = document.getElementById('socialNotifications');
const notificationsBody = document.getElementById('socialNotificationsBody');
const blockedCollapse = document.getElementById('socialBlocked');
const blockedBody = document.getElementById('socialBlockedBody');
const followeesCollapse = document.getElementById('socialFollowees');
const followeesBody = document.getElementById('socialFolloweesBody');
const followersCollapse = document.getElementById('socialFollowers');
const followersBody = document.getElementById('socialFollowersBody');
const socialPanel = document.getElementById('socialPanel');
const followRequestForm = document.querySelector('form[action="/social/follow-request"]');
const socialCountBadges = document.querySelectorAll('[data-social-count]');
const socialPresenceLabels = JSON.parse(socialPanel?.dataset.presenceLabels || '{}');
let socialSocket = null;
