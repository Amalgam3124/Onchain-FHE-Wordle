// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Wordle Game
/// @author Zama-Wordle
/// @notice A privacy-preserving Wordle game using FHE
contract FHEWordle is SepoliaConfig {
  // Word length fixed to 5 letters
  uint8 internal constant WORD_LENGTH = 5;
  // Maximum number of guesses
  uint8 internal constant MAX_GUESSES = 6;

  // Game state
  struct Game {
    bool initialized;
    uint8 guessCount;
    bool completed;
    bool won;
    uint256 gameDay; // Day index when the game started
    ebool hasWonEncrypted; // Encrypted win status
  }

  // Per-player game mapping
  mapping(address => Game) private games;

  // Encrypted target word (each letter as euint8)
  euint8[WORD_LENGTH] private targetWord;

  string[] private wordList = [
    // A
    "AWOKE",
    "ALIEN",
    "ALIGN",
    "AGLOW",
    "ADORE",
    "ABHOR",
    "ACTOR",
    "ACUTE",
    "ADEPT",
    "ALBUM",
    // B
    "BLANK",
    "BRISK",
    "BOUND",
    "BANJO",
    "BLUSH",
    "BRUTE",
    "BICEP",
    "BELOW",
    "BLOAT",
    "BRAIN",
    // C
    "CRANE",
    "CHALK",
    "COVET",
    "CUMIN",
    "COBRA",
    "CANDY",
    "CLONE",
    "COUNT",
    "CURLY",
    "CEDAR",
    // D
    "DRAFT",
    "DRONE",
    "DRINK",
    "DOUBT",
    "DROWN",
    "DUVET",
    "DROPS",
    "DINGO",
    "DIMLY",
    "DECAL",
    // E
    "EPOCH",
    "ELBOW",
    "ENACT",
    "EQUIP",
    "EXULT",
    "EMPTY",
    "ETHIC",
    "EXTRA",
    "ENJOY",
    "EQUAL",
    // F
    "FROST",
    "FLING",
    "FLUTE",
    "FJORD",
    "FRAUD",
    "FABLE",
    "FEINT",
    "FOCUS",
    "FRAME",
    "FLAKY",
    // G
    "GLINT",
    "GROUP",
    "GRACE",
    "GUMBO",
    "GUIDE",
    "GRAIN",
    "GLADE",
    "GRIND",
    "GRAPH",
    "GROWN",
    // H
    "HEART",
    "HANDY",
    "HASTE",
    "HAVEN",
    "HORSE",
    "HOUND",
    "HUMID",
    "HINGE",
    "HOTEL",
    "HYPER",
    // I
    "INDEX",
    "IVORY",
    "IDEAL",
    "INPUT",
    "INLET",
    "IRATE",
    "IMAGE",
    "IMBUE",
    "INFER",
    "INBOX",
    // J
    "JUMBO",
    "JOUST",
    "JUMPY",
    "JOKER",
    "JAUNT",
    "JERKY",
    "JUDGE",
    "JOINT",
    "JOINS",
    "JUMPS",
    // K
    "KNAVE",
    "KNIFE",
    "KIOSK",
    "KNELT",
    "KNURL",
    "KRAIT",
    "KUDOS",
    "KAPUT",
    "KNEAD",
    "KARST",
    // L
    "LIGHT",
    "LASER",
    "LEMON",
    "LAPIS",
    "LUNAR",
    "LYMPH",
    "LOCUS",
    "LOGIC",
    "LODGE",
    "LATCH",
    // M
    "MOUSE",
    "MINTY",
    "MAGIC",
    "MAPLE",
    "MANGO",
    "MOCHA",
    "MOVIE",
    "MOUND",
    "MINOR",
    "MURAL",
    // N
    "NOVEL",
    "NURSE",
    "NIGHT",
    "NEXUS",
    "NOBLE",
    "NUDGE",
    "NORTH",
    "NIFTY",
    "NADIR",
    "NOISE",
    // O
    "ORBIT",
    "OCEAN",
    "OLIVE",
    "OPTIC",
    "OUTER",
    "OUGHT",
    "OPERA",
    "OKAPI",
    "OPIUM",
    "OWING",
    // P
    "PINGS",
    "PAVED",
    "PIANO",
    "PEACH",
    "PLUME",
    "PRISM",
    "PARTY",
    "PLANT",
    "PROVE",
    "PUNCH",
    // Q
    "QUACK",
    "QUICK",
    "QUEST",
    "QUILT",
    "QUARK",
    "QUOTA",
    "QUIET",
    "QUOTE",
    "QUAIL",
    "QUASH",
    // R
    "RADIO",
    "ROGUE",
    "RIDGE",
    "REALM",
    "RANCH",
    "RATIO",
    "ROAST",
    "RUINS",
    "RAVEN",
    "ROUND",
    // S
    "STORM",
    "SNAKE",
    "SMILE",
    "SOLAR",
    "SWIFT",
    "SQUIB",
    "SPUNK",
    "STAGE",
    "SOUND",
    "STERN",
    // T
    "TIGER",
    "TOWER",
    "TULIP",
    "TEMPO",
    "TORCH",
    "THWAX",
    "THORN",
    "TREND",
    "TRUNK",
    "TANGO",
    // U
    "UNCLE",
    "UNITY",
    "ULTRA",
    "UNBOX",
    "URBAN",
    "USAGE",
    "UNTIL",
    "UPSET",
    "USHER",
    "UTILE",
    // V
    "VELDT",
    "VIRUS",
    "VIPER",
    "VAPOR",
    "VOWEL",
    "VALOR",
    "VIGOR",
    "VISTA",
    "VENOM",
    "VIXEN",
    // W
    "WALTZ",
    "WORLD",
    "WHALE",
    "WHEAT",
    "WOVEN",
    "WRUNG",
    "WACKY",
    "WOMAN",
    "WATER",
    "WINDY",
    // X
    "XYLEM",
    "XERUS",
    "XENIA",
    "XENIC",
    "XERIC",
    "XENOS",
    "XYSTI",
    "XYLAN",
    "XYSTE",
    "XEROS",
    // Y
    "YOUTH",
    "YACHT",
    "YOUNG",
    "YODEL",
    "YIELD",
    "YOKEL",
    "YEARN",
    "YAWNS",
    "YEAST",
    "YELPS",
    // Z
    "ZEBRA",
    "ZESTY",
    "ZONAL",
    "ZONED",
    "ZONER",
    "ZILCH",
    "ZLOTY",
    "ZYMIC",
    "ZYGON",
    "ZEBUS"
  ];

  // Contract owner
  address private owner;

  // Current daily word seed
  uint256 private dailySeed;

  // Last day when dailySeed was updated (block.timestamp / 86400)
  uint256 private lastSeedDay;

  // Events
  event GameInitialized(address player);
  event GuessSubmitted(address player, uint8 guessNumber);
  event GameCompleted(address player, bool won);
  event DailyWordUpdated(uint256 indexed day);
  event GameReset(address player);

  constructor() {
    owner = msg.sender;
    updateDailySeed();
  }

  /// @notice Pure helper: checks the word is uppercase letters without repetition
  function hasUniqueLetters(string memory word) internal pure returns (bool) {
    bytes memory w = bytes(word);
    if (w.length != WORD_LENGTH) return false;
    bool[26] memory seen;
    for (uint256 i = 0; i < w.length; ++i) {
      uint8 c = uint8(w[i]);
      if (c < 65 || c > 90) return false; // Only allow 'A'..'Z'
      uint8 idx = c - 65;
      if (seen[idx]) return false;
      seen[idx] = true;
    }
    return true;
  }

  /// @notice Pick index of a unique-letter word based on daily seed (linear probe if needed)
  function getTodayUniqueWordIndex() internal view returns (uint256) {
    uint256 base = dailySeed % wordList.length;
    for (uint256 i = 0; i < wordList.length; i++) {
      uint256 idx = (base + i) % wordList.length;
      if (hasUniqueLetters(wordList[idx])) {
        return idx;
      }
    }
    revert("No unique-letter word available");
  }

  /// @notice Update the daily seed
  function updateDailySeed() public {
    uint256 currentDay = block.timestamp / 86400;

    // Only update once per day to ensure the same word for all players
    if (currentDay != lastSeedDay) {
      // Derive pseudo-random seed from day + previous blockhash (fixed per day)
      dailySeed = uint256(keccak256(abi.encodePacked(currentDay, blockhash(block.number - 1))));
      lastSeedDay = currentDay;
      emit DailyWordUpdated(currentDay);
    }
  }

  /// @notice Initialize the daily game
  function initializeDailyGame() external {
    // Ensure the game is not initialized yet or it's a new day
    uint256 currentDay = block.timestamp / 86400;
    require(
      !games[msg.sender].initialized || games[msg.sender].gameDay != currentDay,
      "Game already initialized today"
    );

    // Refresh the daily seed (idempotent call)
    updateDailySeed();

    // Pick today's unique-letter word
    string memory todayWord = wordList[getTodayUniqueWordIndex()];

    // Encrypt each letter and set it as the target
    for (uint8 i = 0; i < WORD_LENGTH; i++) {
      uint8 charCode = uint8(bytes(todayWord)[i]);
      targetWord[i] = FHE.asEuint8(charCode);
      FHE.allowThis(targetWord[i]);
    }

    // Initialize game state
    games[msg.sender] = Game({
      initialized: true,
      guessCount: 0,
      completed: false,
      won: false,
      gameDay: currentDay,
      hasWonEncrypted: FHE.asEbool(false)
    });

    emit GameInitialized(msg.sender);
  }

  /// @notice Initialize the game with a custom target word (legacy function allowing custom word)
  /// @param encryptedLetters Encrypted letter array
  /// @param proofs Encryption proofs
  function initializeGame(
    externalEuint8[WORD_LENGTH] calldata encryptedLetters,
    bytes[WORD_LENGTH] calldata proofs
  ) external {
    // Ensure the game has not been initialized
    require(!games[msg.sender].initialized, "Game already initialized");

    // Set the encrypted target word
    for (uint8 i = 0; i < WORD_LENGTH; i++) {
      targetWord[i] = FHE.fromExternal(encryptedLetters[i], proofs[i]);
      FHE.allowThis(targetWord[i]);
    }

    // Initialize game state
    games[msg.sender] = Game({
      initialized: true,
      guessCount: 0,
      completed: false,
      won: false,
      gameDay: block.timestamp / 86400,
      hasWonEncrypted: FHE.asEbool(false)
    });

    emit GameInitialized(msg.sender);
  }

  /// @notice Submit a guess and obtain the encrypted results
  /// @param encryptedGuess Encrypted guess word
  /// @param proofs Encryption proofs
  /// @return Encrypted results array, per-position meaning:
  ///         0: Letter not in the word
  ///         1: Letter in the word but wrong position
  ///         2: Letter in the word and correct position
  function submitGuess(
    externalEuint8[WORD_LENGTH] calldata encryptedGuess,
    bytes[WORD_LENGTH] calldata proofs
  ) external returns (euint8[WORD_LENGTH] memory) {
    // Validate game state
    require(games[msg.sender].initialized, "Game not initialized");
    require(!games[msg.sender].completed, "Game already completed");
    require(games[msg.sender].guessCount < MAX_GUESSES, "Maximum guesses reached");

    // Increment guess count
    games[msg.sender].guessCount++;

    // Load encrypted guess values
    euint8[WORD_LENGTH] memory guess;
    for (uint8 i = 0; i < WORD_LENGTH; i++) {
      guess[i] = FHE.fromExternal(encryptedGuess[i], proofs[i]);
    }

    // Compute results
    euint8[WORD_LENGTH] memory results;
    ebool allCorrect = FHE.asEbool(true);

    for (uint8 i = 0; i < WORD_LENGTH; i++) {
      // Check correct position
      ebool correctPosition = FHE.eq(guess[i], targetWord[i]);

      // Check existence in other positions
      ebool inWord = FHE.asEbool(false);
      for (uint8 j = 0; j < WORD_LENGTH; j++) {
        if (i != j) {
          ebool letterMatch = FHE.eq(guess[i], targetWord[j]);
          inWord = FHE.or(inWord, letterMatch);
        }
      }

      // Set result value
      // 2: correct position, 1: in word wrong position, 0: not in word
      euint8 positionValue = FHE.select(correctPosition, FHE.asEuint8(2), FHE.asEuint8(0));
      euint8 inWordValue = FHE.select(inWord, FHE.asEuint8(1), FHE.asEuint8(0));
      results[i] = FHE.select(correctPosition, positionValue, inWordValue);

      // Update all-correct flag
      allCorrect = FHE.and(allCorrect, correctPosition);
    }

    // Check win flag
    ebool hasWon = allCorrect;

    // Allow contract and user to access encrypted per-letter results
    for (uint8 i = 0; i < WORD_LENGTH; i++) {
      FHE.allowThis(results[i]);
      FHE.allow(results[i], msg.sender);
    }

    // Allow contract and user to access encrypted game result
    FHE.allowThis(hasWon);
    FHE.allow(hasWon, msg.sender);

    // Persist encrypted win status
    games[msg.sender].hasWonEncrypted = hasWon;

    if (games[msg.sender].guessCount >= MAX_GUESSES) {
      games[msg.sender].completed = true;
      emit GameCompleted(msg.sender, false);
    }

    emit GuessSubmitted(msg.sender, games[msg.sender].guessCount);

    return results;
  }

  /// @notice Get the encrypted win status (to be decrypted off-chain by the user)
  /// @return Encrypted win status handle
  function getEncryptedWinStatus() external view returns (ebool) {
    require(games[msg.sender].initialized, "Game not initialized");
    return games[msg.sender].hasWonEncrypted;
  }

  /// @notice Check if a new daily word is available
  /// @return Returns true if a new daily word is available
  function hasNewDailyWord() external view returns (bool) {
    uint256 currentDay = block.timestamp / 86400;
    return !games[msg.sender].initialized || games[msg.sender].gameDay != currentDay;
  }

  /// @notice Reset the caller's game state so they can re-initialize the daily game
  function resetGame() external {
    // If a game exists and is initialized, clear state for the caller
    if (games[msg.sender].initialized) {
      games[msg.sender].initialized = false;
      games[msg.sender].guessCount = 0;
      games[msg.sender].completed = false;
      games[msg.sender].won = false;
      games[msg.sender].hasWonEncrypted = FHE.asEbool(false);
    }
    emit GameReset(msg.sender);
  }

  /// @notice Allow contract owner to add a new word to the list
  /// @param newWord New unique-letter word
  function addWord(string calldata newWord) external {
    require(msg.sender == owner, "Only owner can add words");
    require(bytes(newWord).length == WORD_LENGTH, "Word must be 5 letters");

    // Check for duplicate letters
    bool[] memory seen = new bool[](26); // 26 letters
    bytes memory wordBytes = bytes(newWord);

    for (uint256 i = 0; i < wordBytes.length; ++i) {
      uint8 letterIndex = uint8(wordBytes[i]) - 65; // ASCII('A') = 65
      require(letterIndex < 26, "Invalid character");
      require(!seen[letterIndex], "Duplicate letter found");
      seen[letterIndex] = true;
    }

    wordList.push(newWord);
  }
}
