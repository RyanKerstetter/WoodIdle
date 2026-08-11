# Known bugs
## && within package.json does not work on windows




## Ryan write in here

# Architecture

Store all upgrades in a dictionary. Saving and loading the game is as simple as loading the dict.


## Main Progression:

# Currencies

Money / Rebirth Tokens

# Progress through different areas

Each area will have a wood type and a building.

# Areas

Meadow -> Forest -> Tundra -> Jungle -> Desert -> etc -> Infinity

# Logs

Oak -> Birch -> Pine -> Mahogany -> Palm -> ... -> Singularitree

You will automatically be chopping logs of each area you have been to.
Each log will have an associated sell value that can be changed by upgrades.
Log sales are performed automatically

Each wood type also has a level associated. You level up by chopping that type of wood.
Logs | Level
5      1
10     2
20     3
etc

Each level has an associated global upgrade it gives.

Upgrades:
Chop faster
Get more logs
Increase demand
Increase consumer base

# Area Upgrades - Logs

In each area you can upgrade for the specific area:
Log Chop speed
Log sell amount
Log chop amount


# Buildings

Each areas has a building. 

Meadow : Blacksmith
Forest : Library
Tundra : Carpenters Bench
Jungle : Camp

# Forest : Blacksmith : Upgrade Tools


Different item areas will exist:
Axe    : Chop speed
Gloves : Chop yield
Shirt  : Sell price
Boots  : Chop speed
Amulet : Rebirth Token Multiplier
Glasses: Research multiplier

Example upgrade path for Axe:
Rock -> Hard Rock -> Sharp Rock -> Stone Hatches -> Stone Axe -> Copper Hatchet -> etc
Each upgrade takes money

# Meadow : Shrine

Every rebirth will give Tokens corresponding to the (cube root of money earned?)
Formula could look like this (total_gold / 10^10)^.14 * 

Unlock new areas
General upgrades
Unlocked new features ie different blacksmith types

# Tundra : Library

The library earns research over time
Research can be spent on upgrades
These ugprades contain the core of the automation

# Jungle : Town

The town is the area where you can hire people
Manager     - Manager amount adds to the exponent for other multipliers 
Lumberjacks - N^(1+.01*M) times multiplier to logs chopped
Scholar     - N^(1+.01*M) times mulitpier to research
Carpenter   - N^(1+.01*M) times multiplier to sell price
Blacksmith  - N^(1+.01*M) times multiplier to rebirth

So 10 lumberjacks and 10 managers = 10^1.1 * multiplier for logs chopped

# Desert : Camp

Unlocks missions
You can hire mercenaries to go on missions for you
They will bring back loot that can be used for upgrades

Progression:
You start with 1 mercenary slot
You can upgrade this with prestige tokens

Mercenaries can be assigned missions

Missions increase a stat whenever done
For example
Chop Speed
Sell Price
Prestige Token multiplier
etc.
Missions have 4 associated stats
0-25 25-50 50-75 and 75-100
As the mission levels up it scales all stats.




