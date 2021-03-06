// Put your custom code here

lightProperties = {
	'red' : 2,
	'green' : 3,
	'blue' : 4,
	'rgb_brightness' : 5,
	'led_brightness' : 6,
	'program' : 7,
	'speed' : 8
};

programNames = {
	'AUTO' : 1,
	'FLASH' : 2,
	'JUMP3' : 3,
	'JUMP7' : 4,
	'FADE3' : 5,
	'FADE7' : 6
};

memory = {
	'led_brightness' : [ -1, -1 ],
	'rgb_brightness' : [ -1, -1 ],
	'program' : [ -1, -1 ],
	'speed' : [ -1, -1 ],
	'red' : [ -1, -1 ],
	'green' : [ -1, -1 ],
	'blue' : [ -1, -1 ]
};

// websocket session
var session = null;

function rpcCall(adressMask, lightType, value) {
	var send = false;
	for ( var key in lightProperties) {
		if (lightProperties.hasOwnProperty(key)) {
			if (lightProperties[key] == lightType) {
				for ( var i = 0; i < 2; i++) {
					if (Math.floor(adressMask / Math.pow(2, i)) % 2 == 1) {
						if (memory[key][i] != value && memory[key][i] != -1) {
							memory[key][i] = value;
							send = true;
						}
					}
				}
			}
		}
	}
	if (send) {
		publishEvent({
			'event' : 'lightSet',
			'adressMask' : adressMask,
			'lightType' : lightType,
			'value' : value*1
		});
	}
}

function publishEvent(event) {
	session.publish("http://leddimmer.unserHaus.name/event", event);
}

function updateLight(adressMask, lightType, value) {
	for ( var key in lightProperties) {
		if (lightProperties.hasOwnProperty(key)) {
			if (lightProperties[key] == lightType) {
				// update the memory
				for ( var i = 0; i < 2; i++) {
					if (Math.floor(adressMask / Math.pow(2, i)) % 2 == 1) {
						memory[key][i] = value;
					}
				}

				// update the different ui widgets
				if (key == 'program') {
					$('#program_menu option[value=' + value + ']').attr('selected', 'selected');
					$('#program_menu').selectmenu('refresh');
					$('#program_switch').val('on').slider('refresh');
					$('#program_switch').change();
				} else if (key == 'speed') {
					$('#slider_speed').val(value).slider('refresh');
				} else if (key == 'led_brightness') {
					for ( var i = 0; i < 2; i++) {
						if (Math.floor(adressMask / Math.pow(2, i)) % 2 == 1) {
							$('#slider_led' + (i + 1) + '_brightness').val(value).slider('refresh');
						}
					}
				} else {
					$('#slider_' + key).val(value).slider('refresh');
					if (key != 'rgb_brightness') {
						$('#program_switch').val('off').slider('refresh');
						$('#program_switch').change();
					}
				}
			}
		}
	}
}

function setMessage(messageIcon, messageName, messageText) {
	$('#message_button').attr('data-icon', messageIcon);
}

$(function() {
	// register change listeners
	for ( var key in lightProperties) {
		if (lightProperties.hasOwnProperty(key)) {
			if (key == 'program') {
				onchangeClosure = function() {
					var key2 = key;
					return function() {
						rpcCall(3, lightProperties[key2], $('#program_menu').val());
					};
				};
				$('#program_menu').change(onchangeClosure());
			} else if (key == 'led_brightness') {
				for ( var i = 0; i < 2; i++) {
					onchangeClosure = function() {
						var key2 = key;
						var i2 = i;
						return function() {
							rpcCall(Math.pow(2, i2), lightProperties[key2], $('#slider_led' + (i2 + 1) + '_brightness')
									.val());
						};
					};
					$('#slider_led' + (i + 1) + '_brightness').change(onchangeClosure());
				}
			} else {
				onchangeClosure = function() {
					var key2 = key;
					return function() {
						rpcCall(3, lightProperties[key2], $('#slider_' + key2).val());
					};
				};
				$('#slider_' + key).change(onchangeClosure());
			}
		}
	}

	$('#program_switch').change(function() {
		if ($('#program_switch').attr('value') == 'on') {
			$('#program_menu').selectmenu('enable');
			$('#slider_speed').slider('enable');
			$('#slider_red').slider('disable');
			$('#slider_green').slider('disable');
			$('#slider_blue').slider('disable');
			rpcCall(3, lightProperties['program'], $('#program_menu').val());
		} else if ($('#program_switch').attr('value') == 'off') {
			$('#program_menu').selectmenu('disable');
			$('#slider_speed').slider('disable');
			$('#slider_red').slider('enable');
			$('#slider_green').slider('enable');
			$('#slider_blue').slider('enable');
			for ( var key in new Array('red', 'green', 'blue')) {
				rpcCall(3, lightProperties[key], $('#slider_' + key).val());
			}
		}
	});
	$('#program_switch').change();

	for ( var key in programNames) {
		if (programNames.hasOwnProperty(key)) {
			$('#program_menu').append("<option value='" + programNames[key] + "'>" + key + "</option>").selectmenu();
		}
	}
	$('#program_menu').selectmenu('refresh');

	// WAMP server
	// var wsuri = "ws://raspbian.lan:9000";
	var wsuri = "ws://localhost:9000";

	ab.connect(wsuri,
	// WAMP session was established
	function(sess) {
		session = sess;
		session.subscribe("http://leddimmer.unserHaus.name/event", function(topic, event) {
			if (event['event'] = "lightSet") {
				updateLight(event['adressMask'], event['lightType'], event['value']);
			}
		});
	},
	// WAMP session is gone
	function(code, reason) {
		console.log(reason);
	});
});
