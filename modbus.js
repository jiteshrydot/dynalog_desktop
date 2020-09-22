var modbus = require("modbus-stream");
var conn = null;
connectModubs();
function connectModubs() {
    modbus.tcp.connect(502, "192.168.2.231", (err, connection) => {
        if(!err) {
            conn = connection;
            conn.on('error', function() {
                connectModubs();
            })
        }
    });
}
console.log(conn);
setInterval(function(){
    conn.readHoldingRegisters({
        address: 40000,
        quantity: 10,
        extra: {
            unitId: 10
        }
    }, function(err, resp) {
        if(!err) {
            console.log(resp.response.data.map(d => d.toString('hex')))
        } else {
            console.log(err)
        }
    })
}, 2000);