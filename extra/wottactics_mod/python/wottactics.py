import BigWorld
import Vehicle
import json
from Avatar import PlayerAvatar
from threading import Timer
from SimpleWebSocketServer import SimpleWebSocketServer, WebSocket
import socket

PORT = 6412 #as determined by random.org
REFRESH_DELAY = 0.05
BATTLE_POLL = 1.0

#from http://stackoverflow.com/questions/474528/what-is-the-best-way-to-repeatedly-execute-a-function-every-x-seconds-in-python
class RepeatedTimer(object):
	def __init__(self, interval, function):
		self._timer	 = None
		self.interval   = interval
		self.function   = function
		self.is_running = False
		self.start()

	def _run(self):
		self.is_running = False
		self.start()
		self.function()

	def start(self):
		if not self.is_running:
			self._timer = Timer(self.interval, self._run)
			self._timer.start()
			self.is_running = True

	def stop(self):
		self._timer.cancel()
		self.is_running = False


class WebsocketServer(WebSocket):
	def handleMessage(self):
		pass

	def handleConnected(self):
		if (self.address[0] != '127.0.0.1' and self.address[0] != 'localhost'):
			self.terminate()
	
		self.ids = set()
		self.rt = None
		self.arena = None
		self.world_transmitted = False
		self.team_transmitted = False
		self.mapid_transmitted = False

		def echo(s):
			self.sendMessage(s)
		
		def in_battle():
			self.arena = getattr(BigWorld.player(), 'arena', None)
			return (not self.arena is None)

		def add_vehicle(id):
			entity = BigWorld.player().arena.vehicles[id]
			if (not entity['isAlive']):
				return
			tags = entity['vehicleType'].type.tags;
			tank_type = ''
			if ('lightTank' in tags):
				tank_type = 'light'
			elif ('heavyTank' in tags):
				tank_type = 'heavy'
			elif ('mediumTank' in tags):
				tank_type = 'medium'
			elif ('AT-SPG' in tags):
				tank_type = 'td'		
			elif ('SPG' in tags):
				tank_type = 'arty'	
			icon = {
				'team': entity['team'],
				'name': entity['name'],
				'is_alive': entity['isAlive'],
				'tank' : entity['vehicleType'].type.userString,
				'type' : tank_type,
				'id' : id,
				'maxHealth' :entity['vehicleType'].maxHealth
			}
			
			if (BigWorld.entities.has_key(id) and hasattr(BigWorld.entities.get(id), 'position')):
				icon['position'] = map(lambda x: str(x), BigWorld.entities.get(id).position)

			echo(json.dumps(icon))
			self.ids.add(id)

		def wait_for_battle():
			if in_battle():
				if self.rt is not None:
					self.rt.stop()
				battle_start()
				
		def update_position():
			if in_battle():
				if (not self.world_transmitted):
					self.world_transmitted = True
					world = BigWorld.player().arena.arenaType._ArenaType__geometryCfg['boundingBox']
					msg = {'map_dimesions' : [[str(world[0][0]), str(world[0][0])], [str(world[1][0]), str(world[1][0])]]}
					echo(json.dumps(msg))
					
				if (not self.mapid_transmitted):
					self.mapid_transmitted = True
					msg = {'map_id' : BigWorld.player().arena.arenaType._ArenaType__geometryCfg['geometryName'] + '_' + BigWorld.player().arena.arenaType._ArenaType__gameplayCfg['gameplayName']}
					echo(json.dumps(msg))
					
				if (not self.team_transmitted):
					if (hasattr(BigWorld.player(), 'team')):
						self.team_transmitted = True
						echo(json.dumps({'player_team': BigWorld.player().team}))
			
				update = {}
							
				for id in BigWorld.player().arena.vehicles.copy():
					if (id not in self.ids):
						add_vehicle(id)
					if (BigWorld.entities.has_key(id)):
						entity = BigWorld.entities.get(id)
						update[id] = [map(lambda x: str(x), entity.position), entity.health];
					elif (id in BigWorld.player().arena.positions):
						update[id] = [map(lambda x: str(x), BigWorld.player().arena.positions[id])];
					else:
						update[id] = [];

				for key in self.ids.copy():
					if (BigWorld.player().arena.vehicles[key]['isAlive'] == False):
						msg = {'remove' : key}
						echo(json.dumps(msg))
						if (key in self.ids):
							self.ids.remove(key)
				
				if (update != []):
					echo(json.dumps(update))
					
			else:
				echo("BATTLE_ENDED")
				init()
			
		def start_battle_wait():
			if (in_battle()):
				self.rt.stop()
				self.ids = set()
				self.world_transmitted = False
				self.team_transmitted = False
				self.mapid_transmitted = False
				self.rt = RepeatedTimer(REFRESH_DELAY, update_position)
			
		def init():
			if self.rt is not None:
				self.rt.stop()
			self.rt = RepeatedTimer(BATTLE_POLL, start_battle_wait)
		
		init()

	def handleClose(self):
		pass
		

def init():
	server = SimpleWebSocketServer('', PORT, WebsocketServer)
	server.serveforever()	
