p"""
DELIVERY ROBOT
==============
A robot works in a warehouse. Its job: pick up a parcel and deliver it to the customer.
Every move uses battery. If the battery runs out, the robot is stuck.
It can recharge by driving onto the charger.

Nobody tells the robot the way. It learns by TRYING moves, getting POINTS,
and ADJUSTING its guesses. That is reinforcement learning.

YOUR JOB: fill in the 3 pieces of the robot's brain below.
In each piece, replace every ____ (four underscores) with your answer.
Then save, and click "Reload my code" on the page.
"""
# random is Python's built-in tool for making random choices.
import random

# Two tools from engine.py:
#   MOVES      the list of moves: ["up", "down", "left", "right"]
#   best_move  looks in the robot's brain and gives back its best move for a situation
from engine import MOVES, best_move

# This line tells Python (and your editor) what the ____ blanks are. Don't change it.
from engine import ____


# =====================================================================
# PIECE 1: Try a random move
# =====================================================================
# MOVES is the list ["up", "down", "left", "right"].
# random.choice(a_list) picks one item from a list at random.

def random_move():
    # Pick one move from the list of moves, at random, and give it back.
    return random.choice(____)


# =====================================================================
# PIECE 2: Curious or confident?
# =====================================================================
# curiosity is a number from 0 to 1  (0.3 means "curious 30% of the time").
# random.random() gives a random number from 0 to 1.
#
#   curious:    try something new       ->  random_move()
#   confident:  use what it has learned ->  best_move(situation)

def choose_move(situation, curiosity):
    # Roll a random number from 0 to 1.
    # If it's smaller than curiosity, the robot is curious this time.
    if random.random() < ____:
        # Curious: try a random move (that's Piece 1).
        return ____
    else:
        # Confident: use the best move it has learned for this situation.
        return ____


# =====================================================================
# PIECE 3: Learn from what just happened
# =====================================================================
# old_guess  how good the robot THOUGHT this move was
# reward     the points it actually got for the move
# future     how good its NEW situation looks (its best score there)
#
#   target     what the move turned out to be worth
#   new_guess  the old guess, moved a little bit towards the target

def learn(old_guess, reward, future):
    # Step 1: what was the move really worth?
    #         The points it got now, plus how good the future looks (counted a bit less).
    target = reward + DISCOUNT * ____
    # Step 2: move the old guess a little bit (LEARNING_RATE) towards the target.
    new_guess = old_guess + LEARNING_RATE * (target - ____)
    # Step 3: give back the new guess. The engine saves it in the robot's brain.
    return new_guess


# =====================================================================
# SETTINGS: try changing these later!
# =====================================================================
LEARNING_RATE = 0.1     # how big each adjustment is (0.1 = move 10% of the way)
DISCOUNT = 0.9          # how much the future matters (0 = only right now, 0.9 = a lot)
CURIOSITY_DROP = 0.99   # after every game: curiosity = curiosity x 0.99

# The points the robot gets. This is the ONLY way we tell it what we want.
POINTS = {
    "move": -1,           # every move costs a little (time and battery)
    "pickup": 10,         # picked up the parcel
    "deliver": 20,        # delivered it to the customer
    "battery_dead": -50,  # the battery ran out: stuck!
}
BATTERY_SIZE = 30       # how many moves a full battery lasts


# =====================================================================
# Press Run (or type: python robot.py). The app opens in your browser.
# =====================================================================
# This part only runs when you press Run on this file.
# It hands this file to engine.py, which checks your 3 pieces and opens the page.
if __name__ == "__main__":
    import engine
    engine.start(__file__)
