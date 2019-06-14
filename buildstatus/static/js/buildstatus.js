// Copyright 2019 dhtech
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file
hosts = {};
mon_alerts = {};
snmp_errors = {};
snmp_saves = {};
ping_status = {};
rancid_status = {};
syslog_status = {};
build_status = {};

function showError(error) {
  $('#tooltip').css('visibility', 'visible').text('Info: ' + error);
}

function hideError() {
  //$('#tooltip').css('visibility', 'hidden');
}

function updateStatus() {
  build_status = {};

  if (Object.keys(hosts).length == 0)
    return;

  // Assemble all the hosts
  // Set default values
  for(var host in hosts) {
    build_status[host] = new Object();
    build_status[host].error = new Object();
    build_status[host].updated = new Object();
    build_status[host].ping = 'info';
    build_status[host].error.ping = 'No ping response recorded';
    build_status[host].alert = 'check';
    build_status[host].error.alert = 'No alerts firing for host';

    if (hosts[host].options.os == 'vip') {
      build_status[host].syslog = 'eye';
      build_status[host].error.syslog =
        'Syslog log is not relevant';
      build_status[host].ping = 'eye';
      build_status[host].error.ping = 'Not pinging virtual IPs';
    } else if (hosts[host].options.layer == 'access') {
      build_status[host].rancid = 'eye';
      build_status[host].error.rancid =
        'Rancid config is missing, but switch is access';
      build_status[host].syslog = 'eye';
      build_status[host].error.syslog =
        'Syslog log is missing, but switch is access';
    } else {
      if (hosts[host].options.layer == 'services' ||
          hosts[host].options.layer == undefined) {
        build_status[host].rancid = 'eye';
        build_status[host].error.rancid =
          'Rancid config is missing, but is server';
      } else {
        build_status[host].rancid = 'times';
        build_status[host].error.rancid = 'No rancid log found at all';
      }

      build_status[host].syslog = 'times';
      build_status[host].error.syslog = 'No syslog log found at all';
    }
    if (hosts[host].options.layer == undefined) {
      build_status[host].snmp = 'eye';
      build_status[host].error.snmp =
        'No SNMP error recorded, but is server';
    } else {
      build_status[host].snmp = 'eye';
      build_status[host].error.snmp =
        'No SNMP error recorded, but no data either';
    }
  }

  // Override with actual values
  for(var host in snmp_saves) {
    var snmp_save = snmp_saves[host];
    if (hosts[host] == undefined)
      continue

    build_status[host].snmp = snmp_save.metrics > 100 ? 'check' : 'exclamation';
    build_status[host].error.snmp = 'Saved ' + snmp_save.metrics + ' metrics';
  }

  for(var host in snmp_errors) {
    var snmp_error = snmp_errors[host];
    if (hosts[host] == undefined)
      continue

    build_status[host].snmp = snmp_error.error != '' ? 'times' : 'info';
    build_status[host].error.snmp = snmp_error.error;
  }

  for(var host in rancid_status) {
    var rs = rancid_status[host];
    if (hosts[host] == undefined)
      continue

    if (rs.size > 0) {
      build_status[host].rancid = 'check';
      build_status[host].error.rancid =
        'Rancid config is ' + rs.size + ' bytes';
    } else if (hosts[host].options.layer == 'access') {
      build_status[host].rancid = 'eye';
      build_status[host].error.rancid =
        'Rancid config is empty, but switch is access';
    } else {
      build_status[host].rancid = 'times';
      build_status[host].error.rancid =
        'Rancid config is empty';
    }
  }

  for(var host in syslog_status) {
    var ss = syslog_status[host];
    if (hosts[host] == undefined)
      continue

    if (ss.size > 0) {
      build_status[host].syslog = 'check';
      build_status[host].error.syslog =
        'Syslog log is ' + ss.size + ' bytes';
    } else if (hosts[host].options.layer == 'access') {
      build_status[host].syslog = 'check';
      build_status[host].error.syslog =
        'Syslog log is empty, but switch is access';
    } else {
      build_status[host].syslog = 'times';
      build_status[host].error.syslog =
        'Syslog log is empty';
    }
  }

  for(var host in ping_status) {
    var ping = ping_status[host];
    if (hosts[host] == undefined)
      continue

    if (ping > 30) {
      build_status[host].ping = 'times';
      build_status[host].error.ping =
        'Ping response is more than 30 seconds ago';
    } else {
      build_status[host].ping = 'check';
      build_status[host].error.ping =
        'Ping response is less than 30 seconds ago';
    }
    build_status[host].updated.ping = ping;
  }

  for(var host in mon_alerts) {
    var alerts = mon_alerts[host];
    if (hosts[host] == undefined)
      continue

    if (alerts > 0) {
      build_status[host].alert = 'times';
      build_status[host].error.alert =
        'Found ' + alerts + ' firing alerts for host';
    }
    build_status[host].updated.ping = ping;
  }

  renderStatus();
}

function appendStatusRow(tr, entry, prop) {
    if (entry[prop] == 'check') {
      tr.append($('<td>')
        .html('<i class="fas fa-'+ entry[prop] +'"></i>')
    	.css('background-color', '#28a745')
        .css('border-right', '1px rgba(255, 255, 255, 0.70) solid')
        .hover(showError.bind(null, entry.error[prop], entry.updated[prop]), hideError));
    } else if (entry[prop] == 'info') {
      tr.append($('<td>')
        .html('<i class="fas fa-'+ entry[prop] +'"></i>')
    	.css('background-color', '#ffc107')
        .css('border-right', '1px rgba(255, 255, 255, 0.70) solid')
        .hover(showError.bind(null, entry.error[prop], entry.updated[prop]), hideError));
    } else if (entry[prop] == 'times') {
      tr.append($('<td>')
        .html('<i class="fas fa-'+ entry[prop] +'"></i>')
	.css('background-color', '#dc3545')
        .css('border-right', '1px rgba(255, 255, 255, 0.70) solid')
        .hover(showError.bind(null, entry.error[prop], entry.updated[prop]), hideError));
    } else if (entry[prop] == 'eye') {
      tr.append($('<td>')
        .html('<i class="fas fa-'+ entry[prop] +'"></i>')
	.css('background-color','#f2f2f2')
        .css('border-right', '1px rgba(255, 255, 255, 0.70) solid')
        .hover(showError.bind(null, entry.error[prop], entry.updated[prop]), hideError));
    } else if (entry[prop] == 'exclamation') {
      tr.append($('<td>')
        .html('<i class="fas fa-'+ entry[prop] +'"></i>')
        .css('background-color','#6f42c1')
        .css('border-right', '1px rgba(255, 255, 255, 0.70) solid')
        .hover(showError.bind(null, entry.error[prop], entry.updated[prop]), hideError));
    }
}

function renderStatus() {
  var sorted_keys = Object.keys(build_status).sort()
  $('#errors tbody').html('');
  for(var idx in sorted_keys) {
    host = sorted_keys[idx];
    var entry = build_status[host];

    var host_options = hosts[host].options;
    if (host_options.layer == undefined && host_options.pkg == undefined)
      continue;

    if (host_options.layer == 'access') {
      if (!$('#show_access').prop('checked'))
        continue;
    } else if (host_options.layer == 'dist') {
      if (!$('#show_dist').prop('checked'))
        continue;
    } else if (host_options.layer == 'core') {
      if (!$('#show_core').prop('checked'))
        continue;
    } else if (host_options.layer == 'firewall') {
      if (!$('#show_firewall').prop('checked'))
        continue;
    } else if (host_options.layer == 'wifi') {
      if (!$('#show_wifi').prop('checked'))
        continue;
    } else if (host_options.layer == 'services') {
      if (!$('#show_servers').prop('checked'))
        continue;
    } else if (host_options.pkg != undefined) {
      if (!$('#show_servers').prop('checked'))
        continue;
    }

    var tr = $('<tr>');
	
	
	if(host_options.silence == 1)
      tr.append($('<td>')
	 .css('background-color','#f2f2f2')
	 .text(host.replace(/^([^.]+)\.event\.dreamhack\.(local|se)$/, '$1')+' (silenced)'));
    else
      tr.append($('<td>').text(host.replace(/^([^.]+)\.event\.dreamhack\.(local|se)$/, '$1')));

	// Lighter gray if silenced
    if(host_options.silence == 1){
      entry['alert'] = 'eye';
      entry['ping'] = 'eye';
      entry['snmp'] = 'eye';
      entry['rancid'] = 'eye';
      entry['syslog'] = 'eye';
	}
	
    appendStatusRow(tr, entry, 'alert');
    appendStatusRow(tr, entry, 'ping');
    appendStatusRow(tr, entry, 'snmp');
    appendStatusRow(tr, entry, 'rancid');
    appendStatusRow(tr, entry, 'syslog');

    $('#errors').append(tr);
  }
}

function retrieveStatus() {
  $.getJSON('/analytics/snmp.errors', function(objects) {
    snmp_errors = objects;
    updateStatus();
  });
  $.getJSON('/analytics/snmp.saves', function(objects) {
    snmp_saves = objects;
    updateStatus();
  });
  $.getJSON('/analytics/ping.status', function(objects) {
    ping_status = objects;
    updateStatus();
  });
  $.getJSON('/analytics/event.hosts', function(objects) {
    hosts = objects;
    updateStatus();
  });
  $.getJSON('/analytics/rancid.status', function(objects) {
    rancid_status = objects;
    updateStatus();
  });
  $.getJSON('/analytics/syslog.status', function(objects) {
    syslog_status = objects;
    updateStatus();
  });
  $.getJSON('/analytics/mon.alerts', function(objects) {
    mon_alerts = objects;
    updateStatus();
  });
}

setInterval(retrieveStatus(), 10000);
retrieveStatus();
