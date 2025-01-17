const http = require('http');
const url = require('url');
const CecController = require('cec-controller');

var cecCtl = new CecController({ osdString: 'CEC-WEB-API', hdmiPorts: getHdmiPorts() });
var ctlObj = {};
var busy = false;

cecCtl.once('ready', readyHandler);
module.exports = cecCtl;

function readyHandler(controller)
{
	ctlObj = controller;

	cecCtl.server = http.createServer(requestListener);
	const port = (process.argv[2] > 0 && process.argv[2] <= 65535) ? process.argv[2] : 8080;

	cecCtl.emit('created-server', port);
	cecCtl.server.listen(port);
}

function requestListener(req, res)
{
	var data = url.parse(req.url, true);
	var result = getResult(data.pathname.split('/'));

	if(result)
	{
		res.writeHead(200);

		if(typeof result === 'function')
		{
			if(busy) return res.end('Previous function is still running!');

			busy = true;
			var value = (data.query) ? data.query.value : null;

			return result(value).then(response =>
			{
				busy = false;

				if(response === true) res.end('OK');
				else if(response === null) res.end('ERROR');
				else res.end(JSON.stringify(response, null, 2));
			});
		}
		else if(typeof result === 'object')
		{
			result = getObjectFunctions(result);
		}

		return res.end(JSON.stringify(result, null, 2));
	}

	res.writeHead(404);
	res.end('Invalid Request!');
}

function getResult(keysArray)
{
	var result = Object.assign({}, ctlObj);

	for(var key of keysArray)
	{
		if(!key) continue;

		if(typeof result === 'object' && result[key])
			result = result[key];
		else
			return null;
	}

	return result;
}

function getObjectFunctions(obj)
{
	var tmpObj = Object.assign({}, obj);

	Object.keys(tmpObj).forEach(objKey =>
	{
		if(typeof tmpObj[objKey] === 'function')
			tmpObj[objKey] = 'function';
		else if(typeof tmpObj[objKey] === 'object')
			tmpObj[objKey] = getObjectFunctions(tmpObj[objKey]);
	});

	return tmpObj;
}

function getHdmiPorts()
{
	var hdmiPorts = 3;
	var processHdmi = process.argv.find(arg => arg.includes('--hdmi-ports='));

	if(processHdmi)
	{
		var tmpArg = processHdmi.split('=')[1];

		if(!isNaN(tmpArg) && tmpArg > 0)
			hdmiPorts = tmpArg;
	}

	return hdmiPorts;
}
