"""
ENGINE ROOM
===========
Everything that makes the robot app work, except the robot's brain (that lives in robot.py).

    1. The warehouse       the rules of the world
    2. The brain           a table of scores: how good each move looks in each situation
    3. Checking your code  friendly messages when a piece isn't finished yet
    4. Playing and learning
    5. A tiny web server   sends everything to the page in your browser

You don't need to read this file, but you can! It only uses modules that come with Python.
"""
# These all come with Python. Nothing to install.
import importlib.util            # to load robot.py
import json                      # to send data to the browser page
import random                    # for random choices
import socketserver              # part of the web server
import traceback                 # to find which line an error is on
import webbrowser                # to open the page in your browser
from http.server import BaseHTTPRequestHandler, HTTPServer   # the web server
from pathlib import Path         # to work with file and folder names

# The 4 moves the robot can make.
MOVES = ["up", "down", "left", "right"]

# How each move changes the robot's position: (change in row, change in column).
# "up" means one row higher, so the row number goes down by 1.
DIRECTIONS = {"up": (-1, 0), "down": (1, 0), "left": (0, -1), "right": (0, 1)}


# =====================================================================
# 1. THE WAREHOUSE
# =====================================================================
# The map of the warehouse. Each letter is one square:
#   R = where the robot starts    P = parcel pickup    D = drop-off (the customer)
#   C = charger                   # = shelf (can't drive through it)
#   . = empty floor
FLOOR_PLAN = [
    ". . . # . C",
    ". P . # . .",
    ". . . . . .",
    "# # . # # .",
    ". . . . . .",
    "R . . # . D",
]

# One game (one work shift) lasts at most 150 moves.
MOVES_PER_GAME = 150

# Turn the map into a grid (a list of rows) so we can look up any square: GRID[row][col].
GRID = [row.split() for row in FLOOR_PLAN]

# The warehouse is square: 6 rows and 6 columns.
SIZE = len(GRID)


def find(letter):
    """Find where a letter is on the map. Gives back (row, column)."""
    # Look at every row...
    for row in range(SIZE):
        # ...and every column in that row.
        for col in range(SIZE):
            # Found it? Give back its position.
            if GRID[row][col] == letter:
                return (row, col)


# Remember where the important squares are.
START, PICKUP, DROP_OFF, CHARGER = find("R"), find("P"), find("D"), find("C")


def square_name(row, col):
    """Squares are named like a spreadsheet: columns A-F, rows 1-6. The top-left is A1."""
    # Column 0 is "A", column 1 is "B"... Row 0 is "1", row 1 is "2"...
    return "ABCDEF"[col] + str(row + 1)


class Warehouse:
    """The world the robot works in. It knows where the robot is, its battery and its parcel."""

    def __init__(self, battery_size):
        # Remember how big a full battery is, then set up the first game.
        self.battery_size = battery_size
        self.new_game()

    def new_game(self):
        """Put everything back to the start for a new game."""
        self.row, self.col = START            # the robot goes back to the start square
        self.battery = self.battery_size      # with a full battery
        self.carrying = False                 # not carrying a parcel yet
        self.moves = 0                        # no moves made yet
        self.over = False                     # the game is not over

    def battery_level(self):
        """The robot doesn't know its exact battery, only HIGH, MEDIUM or LOW."""
        # Split the battery into 3 equal parts.
        third = self.battery_size / 3
        # More than two thirds left: HIGH.
        if self.battery > 2 * third:
            return "HIGH"
        # More than one third left: MEDIUM.
        if self.battery > third:
            return "MEDIUM"
        # Otherwise: LOW.
        return "LOW"

    def situation(self):
        """What the robot notices: (which square, battery level, carrying a parcel?)"""
        return (square_name(self.row, self.col), self.battery_level(), self.carrying)

    def do_move(self, move, points):
        """Drive one square. Gives back the points earned (as a list of parts) and what happened."""
        # A list of things that happened during this move, like "pickup" or "charge".
        happened = []

        # Step 1: work out which square the move leads to.
        d_row, d_col = DIRECTIONS[move]
        row, col = self.row + d_row, self.col + d_col

        # Step 2: drive there, unless it's outside the warehouse or a shelf.
        if 0 <= row < SIZE and 0 <= col < SIZE and GRID[row][col] != "#":
            self.row, self.col = row, col
        else:
            happened.append("bump")  # hit a wall or a shelf: it stays put, but the move still costs

        # Step 3: every move takes time and uses 1 battery.
        self.moves += 1
        self.battery -= 1
        parts = [("move", points["move"])]    # the points for this move, one part at a time
        here = (self.row, self.col)           # where the robot is now

        # Step 4: did it reach the parcel or the customer?
        if here == PICKUP and not self.carrying:
            # On the pickup square with empty hands: pick up the parcel.
            self.carrying = True
            parts.append(("pickup", points["pickup"]))
            happened.append("pickup")
        elif here == DROP_OFF and self.carrying:
            # At the customer with a parcel: deliver it.
            self.carrying = False
            parts.append(("deliver", points["deliver"]))
            happened.append("deliver")

        # Step 5: on the charger? Fill the battery back up.
        if here == CHARGER:
            self.battery = self.battery_size
            happened.append("charge")

        # Step 6: is the game over?
        if self.battery <= 0:
            # The battery ran out: big minus points, and the game ends.
            parts.append(("battery_dead", points["battery_dead"]))
            happened.append("battery_dead")
            self.over = True
        elif self.moves >= MOVES_PER_GAME:
            # Out of time: the shift is over.
            happened.append("time_up")
            self.over = True

        # Give back the points and what happened.
        return parts, happened

    def snapshot(self):
        """Everything about the robot right now, packed up to send to the page."""
        return {
            "row": self.row, "col": self.col, "square": square_name(self.row, self.col),
            "battery": self.battery, "battery_size": self.battery_size,
            "level": self.battery_level(), "carrying": self.carrying,
        }


# =====================================================================
# 2. THE BRAIN
# =====================================================================
# The brain is a table of scores:
#   brain[situation] = {"up": score, "down": score, "left": score, "right": score}
# A score is the robot's guess of how good that move is in that situation.
# Situations it has never seen start at 0 for every move: it knows nothing yet.
brain = {}


def scores_for(situation):
    """The robot's 4 scores for a situation. A new situation starts with all zeros."""
    # Never been in this situation before? Add a new row of zeros to the table.
    if situation not in brain:
        brain[situation] = {move: 0.0 for move in MOVES}
    # Give back the row.
    return brain[situation]


def best_move(situation):
    """The move with the highest score. If some are tied, pick one of those at random."""
    # Step 1: get the 4 scores for this situation.
    scores = scores_for(situation)
    # Step 2: find the highest score.
    top = max(scores.values())
    # Step 3: pick one of the moves that has that score.
    return random.choice([move for move in MOVES if scores[move] == top])


def brain_key(situation):
    """Turn a situation into text for the page, like "C4|LOW|1"."""
    square, level, carrying = situation
    return f"{square}|{level}|{int(carrying)}"


def brain_for_page():
    """The whole brain table, as text the page can read (scores rounded to 3 decimals)."""
    return {brain_key(s): {m: round(v, 3) for m, v in scores.items()}
            for s, scores in brain.items() if s[0] != "test"}


# =====================================================================
# 3. CHECKING YOUR CODE
# =====================================================================
# The points used if robot.py doesn't set its own.
DEFAULT_POINTS = {"move": -1, "pickup": 10, "deliver": 20, "battery_dead": -50}


class RobotCodeError(Exception):
    """A problem in robot.py, explained in plain words."""


class BlankNotFilled(Exception):
    """A ____ blank in robot.py hasn't been filled in yet."""


class Blank:
    """The ____ blanks in robot.py.

    robot.py imports ____ from here, so your editor doesn't underline the blanks as errors.
    Using a blank before it's filled in (picking from it, comparing it, doing maths with it)
    stops right here, and the page says "Piece N isn't finished yet".
    """
    def _not_filled(self, *args):
        raise BlankNotFilled("This ____ hasn't been filled in yet.")

    # Every way Python might try to use a blank leads to _not_filled.
    __len__ = __iter__ = __getitem__ = __call__ = _not_filled      # picking from it, calling it
    __lt__ = __le__ = __gt__ = __ge__ = _not_filled                # comparing it: < <= > >=
    __add__ = __radd__ = __sub__ = __rsub__ = _not_filled          # + and -
    __mul__ = __rmul__ = __truediv__ = __rtruediv__ = _not_filled  # * and /
    __float__ = __int__ = __index__ = __bool__ = _not_filled       # turning it into a number

    def __repr__(self):
        return "____"


# The blank itself. robot.py imports it with: from engine import ____
____ = Blank()


def load_robot_file(path):
    """Load robot.py (or robot_solution.py) so the engine can use its 3 pieces."""
    # Step 1: tell Python where the file is.
    spec = importlib.util.spec_from_file_location("student_robot", path)
    # Step 2: make an empty module for it.
    module = importlib.util.module_from_spec(spec)
    # Step 3: run the file, which fills the module with its functions and settings.
    spec.loader.exec_module(module)
    return module


def read_settings(robot):
    """Read the SETTINGS part of robot.py. Anything missing uses the normal value."""
    # Start with the normal points, then use any points robot.py sets.
    points = dict(DEFAULT_POINTS)
    points.update(getattr(robot, "POINTS", {}))
    # getattr(robot, "NAME", normal) means: use robot.NAME if it exists, otherwise use normal.
    return {
        "learning_rate": float(getattr(robot, "LEARNING_RATE", 0.1)),
        "discount": float(getattr(robot, "DISCOUNT", 0.9)),
        "curiosity_drop": float(getattr(robot, "CURIOSITY_DROP", 0.99)),
        "battery_size": int(getattr(robot, "BATTERY_SIZE", 30)),
        "points": points,
    }


def line_in_robot_file(error, file_name):
    """Find the line of robot.py where an error happened."""
    # An error remembers every line it passed through. Look from the last one backwards
    # and give back the first line that is in robot.py.
    for frame in reversed(traceback.extract_tb(error.__traceback__)):
        if Path(frame.filename).name == file_name:
            return frame.lineno
    return None


def explain(error, piece, file_name):
    """Turn a Python error into a friendly message."""
    # A ____ blank was used before being filled in. That just means: not finished yet.
    if isinstance(error, BlankNotFilled) or (isinstance(error, NameError) and "____" in str(error)):
        return f"{piece} isn't finished yet: replace the ____ blanks."
    # Any other error: say which line it's on and what Python said.
    line = line_in_robot_file(error, file_name)
    where = f" ({file_name}, line {line})" if line else ""
    return f"{piece} has a problem{where}: {type(error).__name__}: {error}"


def describe_bad_move(value, function_call):
    """A friendly message for when a function gives back something that isn't a move."""
    # Gave back a ____ blank: that line isn't filled in yet.
    if value is ____:
        return f"{function_call} still gives back a ____ blank. Replace it with your answer."
    # Gave back nothing: they probably forgot "return".
    if value is None:
        return f"{function_call} didn't give back a move. Did you forget the word return?"
    # Gave back a function: they probably wrote random_move instead of random_move().
    if callable(value):
        return f"{function_call} gave back a function instead of a move. Did you forget the () at the end?"
    # Gave back something else.
    return f"{function_call} gave back {value!r}, but it should give back one of {MOVES}."


def check_piece_1(robot):
    """Piece 1 should give back a random move. Gives back a problem message, or None if it works."""
    # Step 1: ask for 200 random moves.
    picked = [robot.random_move() for _ in range(200)]
    # Step 2: every answer must be one of the 4 moves.
    for value in picked:
        if value not in MOVES:
            return describe_bad_move(value, "random_move()")
    # Step 3: after 200 tries, all 4 moves should have come up.
    if len(set(picked)) < len(MOVES):
        return f"random_move() only ever picked {sorted(set(picked))}. It should pick any of the 4 moves at random."
    # No problems found.
    return None


def check_piece_2(robot):
    """Piece 2 should use best_move() when not curious, and random_move() when curious."""
    # Step 1: make a pretend situation where "left" is clearly the best move.
    test = ("test", "HIGH", False)
    brain[test] = {"up": 0.0, "down": 0.0, "left": 5.0, "right": 0.0}
    try:
        # Step 2: try it with curiosity 0 (never curious) and curiosity 1 (always curious).
        confident = [robot.choose_move(test, 0.0) for _ in range(30)]
        curious = [robot.choose_move(test, 1.0) for _ in range(100)]
    finally:
        # Step 3: remove the pretend situation again, even if something went wrong.
        del brain[test]
    # Step 4: every answer must be one of the 4 moves.
    for value in confident + curious:
        if value not in MOVES:
            return describe_bad_move(value, "choose_move()")
    # Step 5: never curious means it should always pick the best move, "left".
    if set(confident) != {"left"}:
        return ("With curiosity 0 the robot should always use best_move(situation), "
                f"but it picked {sorted(set(confident))}.")
    # Step 6: always curious means it should pick lots of different moves.
    if len(set(curious)) < 3:
        return ("With curiosity 1 (100% curious) the robot should always use random_move(), "
                f"but it only picked {sorted(set(curious))}.")
    # No problems found.
    return None


def check_piece_3(robot, settings):
    """Piece 3 should follow the learning formula. Try it on 3 examples."""
    rate, discount = settings["learning_rate"], settings["discount"]
    # Each example is (old guess, reward, future).
    for old, reward, future in [(0.0, 10, 0.0), (2.0, -1, 5.0), (-3.0, -50, 0.0)]:
        # Work out the right answer ourselves...
        expected = old + rate * (reward + discount * future - old)
        # ...and compare it with what learn() gives back.
        got = robot.learn(old, reward, future)
        if got is None:
            return "learn() didn't give back a number. Did you forget the word return?"
        if not isinstance(got, (int, float)) or abs(got - expected) > 1e-6:
            return (f"learn({old}, {reward}, {future}) gave back {got!r}, "
                    f"but it should be {expected:.3f}. Check the two formula lines.")
    # No problems found.
    return None


def check_pieces(robot, settings, file_name):
    """Run each piece on small examples. Gives back {"1": {"ok": ..., "message": ...}, ...}"""
    results = {}
    # The 3 checks, in order.
    checks = [("1", lambda: check_piece_1(robot)),
              ("2", lambda: check_piece_2(robot)),
              ("3", lambda: check_piece_3(robot, settings))]
    for number, check in checks:
        piece = f"Piece {number}"
        # Piece 2 uses Piece 1, so there's no point checking it until Piece 1 works.
        if number == "2" and not results["1"]["ok"]:
            results[number] = {"ok": False, "message": "Piece 2 uses random_move(), so finish Piece 1 first."}
            continue
        # Run the check. If the piece crashes, turn the error into a friendly message.
        try:
            problem = check()
        except Exception as error:
            problem = explain(error, piece, file_name)
        # Save the result: ok or not, and a message to show.
        results[number] = {"ok": problem is None, "message": problem or f"{piece} works."}
    return results


# =====================================================================
# 4. PLAYING AND LEARNING
# =====================================================================
class Session:
    """One robot, its brain, and everything it has done so far."""

    def __init__(self, robot_file):
        # Remember where robot.py is, then load it.
        self.robot_file = Path(robot_file).resolve()
        self.reload()

    # ---------------------------------------------------------- your code
    def reload(self):
        """(Re)read robot.py and check the 3 pieces. Starts a fresh brain."""
        # Step 1: forget the old code and the old brain.
        self.robot, self.code_error = None, None
        brain.clear()

        # Step 2: load robot.py. If Python can't even read it (a typo), remember why.
        try:
            self.robot = load_robot_file(self.robot_file)
        except SyntaxError as error:
            self.code_error = f"Python can't read {self.robot_file.name}, line {error.lineno}: {error.msg}"
        except Exception as error:
            self.code_error = explain(error, self.robot_file.name, self.robot_file.name)

        # Step 3: read the settings and check the 3 pieces.
        if self.robot is None:
            # The file didn't load: use normal settings and mark every piece as not working.
            self.settings = read_settings(object())
            self.pieces = {n: {"ok": False, "message": self.code_error} for n in "123"}
        else:
            self.settings = read_settings(self.robot)
            self.pieces = check_pieces(self.robot, self.settings, self.robot_file.name)
            self.watch_choices()

        # Step 4: start again from game 1.
        self.reset()

    def watch_choices(self):
        """Quietly note whether choose_move() used random_move() or best_move(), for the log."""
        robot, original_random_move = self.robot, self.robot.random_move

        # A copy of random_move() that also writes down "curious".
        def random_move_watched():
            self.choice_kind = "curious"
            return original_random_move()

        # A copy of best_move() that also writes down "confident".
        def best_move_watched(situation):
            self.choice_kind = "confident"
            return best_move(situation)

        # Swap them in. Your choose_move() now uses these copies without knowing.
        robot.random_move = random_move_watched
        robot.best_move = best_move_watched

    def ready(self, number):
        """Does this piece work? True or False."""
        return self.pieces[number]["ok"]

    def call_robot(self, piece, function, *args):
        """Run one of your pieces. If it crashes, turn the error into a friendly message."""
        try:
            return function(*args)
        except Exception as error:
            traceback.print_exc()   # also show the full Python error in the terminal
            raise RobotCodeError(explain(error, piece, self.robot_file.name))

    # ---------------------------------------------------------- the brain
    def reset(self):
        """Forget everything and start again."""
        brain.clear()                                              # empty brain
        self.warehouse = Warehouse(self.settings["battery_size"])  # a fresh warehouse
        self.curiosity = 1.0                                       # 100% curious at the start
        self.games_played = 0
        self.history = []        # one summary per finished practice game (for the charts)
        self.game_active = False # no game is being played right now
        self.mode = "learn"      # "learn" = practice game, "test" = no curiosity, no learning
        self.stats = {}

    def start_game(self, mode):
        """Start a new game: robot back to the start, counters back to 0."""
        self.warehouse.new_game()
        self.game_active = True
        self.mode = mode
        self.stats = {"deliveries": 0, "charges": 0, "bumps": 0, "points": 0}

    def choose(self, situation, curiosity):
        """Ask the robot's code for a move. Gives back (move, "curious" or "confident")."""
        self.choice_kind = None
        if self.ready("2"):
            # Piece 2 works: let it choose.
            move = self.call_robot("Piece 2", self.robot.choose_move, situation, curiosity)
        elif curiosity > 0:
            # No Piece 2 yet: always make a random move with Piece 1.
            move = self.call_robot("Piece 1", self.robot.random_move)
        else:
            # Test game without Piece 2: just use the best move.
            move = best_move(situation)
            self.choice_kind = "confident"

        # Make sure the answer is a real move.
        if move not in MOVES:
            raise RobotCodeError(describe_bad_move(move, "choose_move()"))

        # If we couldn't tell how it chose, guess: the best move means "confident".
        if self.choice_kind is None:
            scores = scores_for(situation)
            self.choice_kind = "confident" if scores[move] == max(scores.values()) else "curious"
        return move, self.choice_kind

    def play_one_move(self, mode=None):
        """One turn: SEE -> THINK -> DO -> RESULT -> ADJUST. Gives back everything that happened."""
        # The robot can't move at all without Piece 1.
        if not self.ready("1"):
            raise RobotCodeError(self.pieces["1"]["message"])
        # No game running (or a different kind of game was asked for)? Start a new one.
        if not self.game_active or (mode and mode != self.mode):
            self.start_game(mode or "learn")

        house = self.warehouse
        before = house.snapshot()   # remember how things were before the move, for the page

        # 1. SEE: what situation is the robot in?
        situation = house.situation()

        # 2. THINK: look up its 4 scores for this situation.
        thoughts = dict(scores_for(situation))

        # 3. DO: choose a move (your Piece 2). Test games are never curious.
        curiosity = self.curiosity if self.mode == "learn" else 0.0
        move, kind = self.choose(situation, curiosity)

        # 4. RESULT: the warehouse moves the robot and hands out the points.
        parts, happened = house.do_move(move, self.settings["points"])
        reward = sum(points for _, points in parts)   # add up all the points
        next_situation = house.situation()            # where it ended up

        # 5. ADJUST: update the score for the move it just made (your Piece 3).
        learned = None
        if self.mode == "learn" and self.ready("3"):
            # "future" = the best score in the new situation. If the game is over, there's no future.
            future = 0.0 if house.over else max(scores_for(next_situation).values())
            old = brain[situation][move]                                        # the old guess
            new = float(self.call_robot("Piece 3", self.robot.learn, old, reward, future))
            brain[situation][move] = new                                        # save the new guess
            # Remember the numbers so the page can show the formula.
            learned = {"key": brain_key(situation), "move": move, "old": old, "new": new,
                       "reward": reward, "future": future,
                       "target": reward + self.settings["discount"] * future,
                       "scores": dict(brain[situation])}

        # Add to this game's totals.
        self.stats["points"] += reward
        self.stats["deliveries"] += "deliver" in happened
        self.stats["charges"] += "charge" in happened
        self.stats["bumps"] += "bump" in happened

        # Pack up everything that happened, for the page.
        event = {
            "mode": self.mode, "game": self.games_played + 1, "move_number": house.moves,
            "curiosity": curiosity, "before": before, "after": house.snapshot(),
            "situation": brain_key(situation), "thoughts": thoughts,
            "move": move, "kind": kind, "parts": parts, "reward": reward,
            "happened": happened, "learned": learned, "game_over": house.over,
            "learning": self.ready("3"),
        }
        # Was that the last move of the game? Then finish the game too.
        if house.over:
            event["summary"] = self.finish_game(happened)
        return event

    def finish_game(self, happened):
        """The game is over: write a summary and get a little less curious."""
        self.game_active = False
        # Step 1: write a summary of the game.
        summary = dict(self.stats, mode=self.mode, moves=self.warehouse.moves,
                       battery_dead="battery_dead" in happened, curiosity=self.curiosity)
        # Step 2: practice games count. Test games don't.
        if self.mode == "learn":
            self.games_played += 1
            summary["game"] = self.games_played
            self.history.append(summary)
            # Step 3: be a little less curious next game (curiosity x 0.99).
            self.curiosity *= self.settings["curiosity_drop"]
        return summary

    def train(self, games):
        """Play many practice games at full speed."""
        # Practising needs Piece 1 (to move) and Piece 3 (to learn).
        if not (self.ready("1") and self.ready("3")):
            raise RobotCodeError("The robot needs Piece 1 and Piece 3 before it can practise.")
        # If a test game was half-played, drop it.
        if self.game_active and self.mode != "learn":
            self.game_active = False
        # Keep making moves until enough games have finished.
        summaries = []
        while len(summaries) < games:
            event = self.play_one_move("learn")
            if event["game_over"]:
                summaries.append(event["summary"])
        return summaries

    # ---------------------------------------------------------- for the page
    def state(self):
        """Everything the page needs to draw itself from scratch."""
        return {
            "floor": GRID, "moves_per_game": MOVES_PER_GAME, "moves": MOVES,
            "file_name": self.robot_file.name, "code_error": self.code_error,
            "pieces": self.pieces, "settings": self.settings,
            "brain": brain_for_page(), "history": self.history,
            "curiosity": self.curiosity, "games_played": self.games_played,
            "robot": self.warehouse.snapshot(),
            "game_active": self.game_active, "mode": self.mode,
            "move_number": self.warehouse.moves if self.game_active else 0,
        }


# =====================================================================
# 5. A TINY WEB SERVER (only reachable from your own computer)
# =====================================================================
# Where the page's files are, and what kind of file each one is.
WEB_FOLDER = Path(__file__).resolve().parent / "web"
WEB_FILES = {"index.html": "text/html", "style.css": "text/css", "app.js": "text/javascript"}


class LocalServer(HTTPServer):
    def server_bind(self):
        # The normal version looks up this computer's network name, which can take
        # half a minute on some laptops. A local app doesn't need it, so skip it.
        socketserver.TCPServer.server_bind(self)
        self.server_name, self.server_port = self.server_address[:2]


class Handler(BaseHTTPRequestHandler):
    """Answers the browser. The browser asks for the page, and asks "next move?" while you play."""
    session = None  # set in start()

    def do_GET(self):
        """The browser wants a file, or the current state."""
        # Step 1: which address did it ask for? "/" means the main page.
        path = self.path.split("?")[0].lstrip("/") or "index.html"
        # Step 2: it wants the current state: send it.
        if path == "api/state":
            return self.send_json(self.session.state())
        # Step 3: only send the 3 page files, nothing else from your computer.
        if path not in WEB_FILES:
            return self.send_error(404)
        self.send_bytes((WEB_FOLDER / path).read_bytes(), WEB_FILES[path] + "; charset=utf-8")

    def do_POST(self):
        """The browser pressed a button: one move, train, reset or reload."""
        # Step 1: read what the browser sent.
        length = int(self.headers.get("Content-Length") or 0)
        body = json.loads(self.rfile.read(length) or b"{}")
        session = self.session
        try:
            # Step 2: do what was asked.
            path = self.path.split("?")[0]
            if path == "/api/step":
                # One move (Play and Step use this).
                event = session.play_one_move(body.get("mode"))
                reply = {"event": event, "curiosity": session.curiosity,
                         "games_played": session.games_played}
            elif path == "/api/train":
                # Many practice games at full speed.
                summaries = session.train(int(body.get("games", 10)))
                reply = {"summaries": summaries, "state": session.state()}
            elif path == "/api/reset":
                # Forget everything.
                session.reset()
                reply = {"state": session.state()}
            elif path == "/api/reload":
                # Read robot.py again (after you edit it).
                session.reload()
                print_piece_report(session)
                reply = {"state": session.state()}
            else:
                return self.send_error(404)
        except RobotCodeError as error:
            # A problem in robot.py: send the friendly message to the page.
            reply = {"error": str(error)}
        except Exception as error:
            # Something else went wrong: show it in the terminal and on the page.
            traceback.print_exc()
            reply = {"error": f"Something went wrong in the app: {type(error).__name__}: {error}"}
        # Step 3: send the answer back.
        self.send_json(reply)

    def send_json(self, data):
        """Send Python data to the browser (as JSON text)."""
        self.send_bytes(json.dumps(data).encode("utf-8"), "application/json")

    def send_bytes(self, data, content_type):
        """Send an answer: a header saying what it is, then the data itself."""
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")   # always send the newest version
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass  # keep the terminal quiet


def print_piece_report(session):
    """Print which pieces work, in the terminal."""
    print()
    for number, result in session.pieces.items():
        mark = "[ok]" if result["ok"] else "[  ]"
        print(f"  {mark} Piece {number}: {result['message']}", flush=True)
    print()


def start(robot_file):
    """Check robot.py, start the local server and open the page in your browser."""
    # Step 1: load robot.py and check the 3 pieces.
    session = Session(robot_file)
    Handler.session = session
    print_piece_report(session)

    # Step 2: start the server on the first free "port" (a door number) from 8000 up.
    server = None
    for port in range(8000, 8050):
        try:
            server = LocalServer(("127.0.0.1", port), Handler)
            break
        except OSError:
            continue  # that port is busy, try the next one
    if server is None:
        raise SystemExit("Couldn't find a free port between 8000 and 8049.")

    # Step 3: say where the app is, and open it in the browser.
    url = f"http://127.0.0.1:{port}"
    print(f"The robot app is running at {url}", flush=True)
    print("Keep this running. To stop it, press Stop in your IDE (or Ctrl+C).", flush=True)
    webbrowser.open(url)

    # Step 4: keep answering the browser until you press Stop (or Ctrl+C).
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped. Bye!")
