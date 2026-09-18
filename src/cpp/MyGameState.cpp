#include "MyGameState.h"
#include "EngineUtils.h"
#include "ABall.h"
#include "Kismet/GameplayStatics.h"
#include "GameFramework/PlayerState.h"
#include "Math/UnrealMathUtility.h"


int32 AMyGameState::GetLowestNumberedBall()
{
    int32 Lowest = 10;
    for (int32 i = 1; i < BallPocketed.Num(); ++i)
    {
        if (!BallPocketed[i])
        {
            Lowest = FMath::Min(Lowest, i);
        }
    }
    return Lowest;
}


void AMyGameState::HandlePlayerShot(FVector CueBallVelocity)
{
    UE_LOG(LogTemp, Warning, TEXT("HandlePlayerShot called with velocity: %s"), *CueBallVelocity.ToString());
}


void AMyGameState::HandleBallPocketed(int32 BallIndex, FVector PocketLocation)
{
    if (BallIndex >= 0 && BallIndex < BallPocketed.Num() && !BallPocketed[BallIndex])
    {
        BallPocketed[BallIndex] = true;

        // Authoritative Rule: If 9-ball is pocketed legally, current set is over
        if (BallIndex == 9 && !bFoulOccurred)
        {
            CurrentGamePhase = EGamePhase::GameOverSet;
            if (CurrentPlayer)
            {
                SetsWon.FindOrAdd(CurrentPlayer)++;
                CheckForMatchOver();
            }
        }
        else if (bFoulOccurred)
        {
            // APA Rule: If the 9-ball is pocketed on a foul, it is spotted (respawned)
            if (BallIndex == 9)
            {
                 BallPocketed[BallIndex] = false;
                 // Trigger respawn logic on clients
                 UE_LOG(LogTemp, Warning, TEXT("9-Ball pocketed on foul. Respotting..."));
            }
        }


        UpdateLowestNumberedBall();
    }
}


void AMyGameState::CheckForFouls(int32 FirstContactBall)
{
}


bool AMyGameState::IsGameOverSet()
{
    return CurrentGamePhase == EGamePhase::GameOverSet;
}


bool AMyGameState::IsGameOverMatch()
{
    if (PlayersInMatch.Num() == 2)
    {
        int32 SetsWonPlayer1 = SetsWon.Contains(PlayersInMatch[0]) ? *SetsWon.Find(PlayersInMatch[0]) : 0;
        int32 SetsWonPlayer2 = SetsWon.Contains(PlayersInMatch[1]) ? *SetsWon.Find(PlayersInMatch[1]) : 0;
        return SetsWonPlayer1 >= 2 || SetsWonPlayer2 >= 2;
    }
    return false;
}


void AMyGameState::EndTurn()
{
    if (CurrentPlayer && !IsGameOverSet())
    {
        int32 CurrentPlayerIndex = PlayersInMatch.Find(CurrentPlayer);
        if (CurrentPlayerIndex != INDEX_NONE && PlayersInMatch.Num() > 1)
        {
            CurrentPlayer = PlayersInMatch[(CurrentPlayerIndex + 1) % PlayersInMatch.Num()];
            UE_LOG(LogTemp, Warning, TEXT("Turn ended, current player is now %s"), *CurrentPlayer->GetPlayerName());
            bFoulOccurred = false;
            LastFoulType = EFoulType::None;
                    }
    }
}


void AMyGameState::StartNewSet(TArray<APlayerState*> NewPlayers)
{
    PlayersInMatch = NewPlayers;
    PopulateActiveBalls();
    InitializeBallPocketed();
    CurrentPlayer = PlayersInMatch.IsValidIndex(0) ? PlayersInMatch[0] : nullptr;
    bFoulOccurred = false;
    LastFoulType = EFoulType::None;

   LowestNumberedBall = 1;
    CurrentTurnNumber = 0;
    CurrentGamePhase = EGamePhase::Breaking;
    for (APlayerState* Player : PlayersInMatch)
    {
        SetsWon.FindOrAdd(Player, 0);
    }
}


void AMyGameState::StartNewMatch(TArray<APlayerState*> NewPlayers)
{
    PlayersInMatch = NewPlayers;
    SetsWon.Empty();
    WinningPlayerIndexMatch = -1;
    for (APlayerState* Player : PlayersInMatch)
    {
        SetsWon.Add(Player, 0);
        PlayerSkillRating.FindOrAdd(Player, 1000.0f);
    }
    CurrentGamePhase = EGamePhase::SettingUpMatch;
    StartNewSet(NewPlayers);
}


void AMyGameState::UpdatePlayerSkill(APlayerState* Winner, APlayerState* Loser)
{
    float WinnerRating = PlayerSkillRating.FindOrAdd(Winner, 1000.0f);
    float LoserRating = PlayerSkillRating.FindOrAdd(Loser, 1000.0f);
    float ExpectedWin = 1.0f / (1.0f + FMath::Pow(10.0f, (LoserRating - WinnerRating) / 400.0f));
    float ExpectedLoss = 1.0f / (1.0f + FMath::Pow(10.0f, (WinnerRating - LoserRating) / 400.0f));
    float K = 32.0f;
    PlayerSkillRating[Winner] = WinnerRating + K * (1.0f - ExpectedWin);
    PlayerSkillRating[Loser] = LoserRating + K * (0.0f - ExpectedLoss);
}


TArray<APlayerState*> AMyGameState::GetFairMatchPairing(TArray<APlayerState*> AvailablePlayers)
{
    TArray<APlayerState*> SortedPlayers = AvailablePlayers;
    SortedPlayers.Sort([this](const APlayerState& A, const APlayerState& B) {
        return PlayerSkillRating.FindOrAdd(&A, 1000.0f) < PlayerSkillRating.FindOrAdd(&B, 1000.0f);
    });
    TArray<APlayerState*> Pairing;
    if (SortedPlayers.Num() >= 2)
    {
        Pairing.Add(SortedPlayers[0]);
        Pairing.Add(SortedPlayers[1]);
    }
    return Pairing;
}


void AMyGameState::PopulateActiveBalls()
{
    ActiveBalls.Empty();
    for (TActorIterator<ABall> It(GetWorld()); It; ++It)
    {
        ABall* Ball = *It;
        ActiveBalls.Add(Ball);
    }
    ActiveBalls.Sort([](const ABall& A, const ABall& B) {
        return A.BallNumber < B.BallNumber;
    });
}


void AMyGameState::InitializeBallPocketed()
{
    BallPocketed.Init(false, ActiveBalls.Num());
}


void AMyGameState::CheckForMatchOver()
{
    if (IsGameOverMatch())
    {
        APlayerState* Player1 = PlayersInMatch.IsValidIndex(0) ? PlayersInMatch[0] : nullptr;
        APlayerState* Player2 = PlayersInMatch.IsValidIndex(1) ? PlayersInMatch[1] : nullptr;
        int32 SetsWonPlayer1 = Player1 ? SetsWon.FindOrAdd(Player1, 0) : 0;
        int32 SetsWonPlayer2 = Player2 ? SetsWon.FindOrAdd(Player2, 0) : 0;
        if (SetsWonPlayer1 >= 2)
        {
            WinningPlayerIndexMatch = 0;
            CurrentGamePhase = EGamePhase::GameOverMatch;
        }
        else if (SetsWonPlayer2 >= 2)
        {
            WinningPlayerIndexMatch = 1;
            CurrentGamePhase = EGamePhase::GameOverMatch;
        }
    }
}


void AMyGameState::UpdateLowestNumberedBall()
{
    LowestNumberedBall = GetLowestNumberedBall();
}
