/*global $, openpgp, MozActivity*/
/*jslint browser: true */

var curContact, contacts;

String.prototype.addSpaces = function (n) {
    'use strict';
    var ret = [], i, len;
    for (i = 0, len = this.length; i < len; i += n) {
        ret.push(this.substr(i, n));
    }
    return ret.join(' ');
};
function listContactIdentities(index, contact) {
    'use strict';
    if (contact.userId) {
        $('.identities_header').after($('<li class="identity" data-i="' + index + '"></li>').text(contact.userId.userid));
    }
}

function listContactEmails(index, contact) {
    'use strict';
    if (contact.userId) {
        $('#email').append($('<option class="email" data-i="' + index + '"></option>').text(contact.userId.userid));
    }
}

function showContactKeyInfo(key) {
    'use strict';
    var publicKey = openpgp.key.readArmored(key);
    sessionStorage.setItem('curKey', key);
    $(publicKey.keys[0].users).each(listContactIdentities);
    $('.identities').listview('refresh');
    $('.fingerprint').text(publicKey.keys[0].primaryKey.fingerprint.toUpperCase().addSpaces(4));
}

function initContactInfoDialog() {
    'use strict';
    var newContact =  sessionStorage.getItem('curContact');
    if (!newContact) {
        $.mobile.changePage('#home');
    } else if (curContact !== newContact) {
        curContact = newContact;
        $('.contactname').text(curContact);
        $('.identity').remove();
        $('.fingerprint').empty();
        showContactKeyInfo(contacts[curContact]);
    }
}

function initEncryptDialog() {
    'use strict';
    if (sessionStorage.getItem('curKey') && sessionStorage.getItem('curContact')) {
        $('.encryptFor').text('Encrypt a message for ' + sessionStorage.getItem('curContact'));
    } else {
        $.mobile.changePage('#home');
    }
}

function initSendDialog() {
    'use strict';
    if ($('#message').val() && sessionStorage.getItem('curKey')) {
        if (typeof MozActivity !== 'function') {
            $('.sendSMS').addClass('ui-disabled');
        }
        $('.sendFor').text('Encrypted message for ' + sessionStorage.getItem('curContact'));
        var publicKey = openpgp.key.readArmored(sessionStorage.getItem('curKey'));
        $('#encrypted_message').val(openpgp.encryptMessage(publicKey.keys, $('#message').val()));
        $('.email').remove();
        $(publicKey.keys[0].users).each(listContactEmails);
        $('#email').selectmenu('refresh');
    } else {
        $.mobile.changePage('#encryptDialog');
    }
}

function listContacts(name) {
    'use strict';
    $('.contacts_divider').after('<li class="contact"><a data-contact="' + name + '" class="getKey" href="#contactInfoDialog">' + name + '</a><a data-contact="' + name + '"  class="delContact" data-icon="delete">Delete contact</a></li>');
}

function getContacts() {
    'use strict';
    contacts = JSON.parse(localStorage.getItem('contacts'));
}

function initHomeView() {
    'use strict';
    var $contacts = $('.contacts');
    getContacts();
    if ($contacts.data("mobile-listview")) {
        $('.contact').remove();
        if (contacts && Object.getOwnPropertyNames(contacts).length > 0) {
            $.each(contacts, listContacts);
        } else {
            $('.contacts_divider').after('<li class="contact">No contact yet</li>');
        }
        $contacts.listview('refresh');
        $('.getKey').click(function () {
            sessionStorage.setItem('curContact', $(this).data('contact'));
        });
        $('.delContact').click(function () {
            delete contacts[$(this).data('contact')];
            localStorage.setItem('contacts', JSON.stringify(contacts));
            initHomeView();
        });
    }
}

function initAddContactDialog() {
    'use strict';
    if (navigator.onLine) {
        $('#keybaseid').textinput('enable');
    } else {
        $('#keybaseid').textinput('disable');
    }
}

function initView(e, page) {
    'use strict';
    switch (page.toPage.attr('id')) {
    case 'encryptDialog':
        initEncryptDialog();
        break;
    case 'contactInfoDialog':
        initContactInfoDialog();
        break;
    case 'home':
        initHomeView();
        break;
    case 'sendDialog':
        initSendDialog();
        break;
    case 'addContactDialog':
        initAddContactDialog();
        break;
    }
}

function sendMail() {
    'use strict';
    window.location.href = 'mailto:' + $('#email').val() + '?body=' + encodeURIComponent($('#encrypted_message').val());
}

function sendSMS() {
    'use strict';
    var activity = new MozActivity({
        name: "new",
        data: {
            type: 'websms/sms',
            number: '',
            body: $('#encrypted_message').val()
        }
    });
}

function addContactKey(name, key) {
    'use strict';
    if (openpgp.key.readArmored(key).keys[0]) {
        if (!contacts) {
            contacts = {};
        }
        contacts[name] = key;
        localStorage.setItem('contacts', JSON.stringify(contacts));
        initHomeView();
    }
}

function addContact() {
    'use strict';
    var keybaseid = $('#keybaseid').val(), contactname = $('#contactname').val(), gpgkey = $('#gpgkey').val();
    if (keybaseid) {
        $.get('https://keybase.io/' + keybaseid + '/key.asc', function (key) {
            addContactKey(keybaseid, key);
        });
    } else if (contactname) {
        addContactKey(contactname, gpgkey);
    }
}

function init() {
    'use strict';
    initHomeView();
    $(document).on('pagechange', initView);
    $('.sendMail').click(sendMail);
    $('.sendSMS').click(sendSMS);
    $('#addContact').click(addContact);
}

$(document).ready(init);
