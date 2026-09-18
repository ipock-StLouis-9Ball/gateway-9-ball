#pragma once


#include "CoreMinimal.h"
#include "GameFramework/GameStateBase.h"
#include "Engine/NetDriver.h"
#include "GameFramework/PlayerState.h"
#include "MyGameState.generated.h"


UENUM(BlueprintType)
enum class EGamePhase : uint8
{
    SettingUpMatch UMETA(DisplayName = "Setting Up Match"),
    Breaking UMETA(DisplayName = "Breaking"),
    InPlay UMETA(DisplayName = "InPlay"),
    GameOverSet UMETA(DisplayName = "Game Over Set"),
    GameOverMatch UMETA(DisplayName = "Game Over Match")
};


UENUM(BlueprintType)
enum class EFoulType : uint8
{
    None UMETA(DisplayName = "None"),
    IllegalBreak UMETA(DisplayName = "Illegal Break"),
    IllegalFirstContact UMETA(DisplayName = "Illegal First Contact"),
    CueBallScratch UMETA(DisplayName = "Cue Ball Scratch"),
    CueBallPocketed UMETA(DisplayName = "Cue Ball Pocketed"),
    BallOffTable UMETA(DisplayName = "Ball Off Table"),
    TouchingBall UMETA(DisplayName = "Touching Ball"),
    DoubleHit UMETA(DisplayName = "Double Hit"),
    PushShot UMETA(DisplayName = "Push Shot"),
    ShootingWhileMoving UMETA(DisplayName = "Shooting While Moving")
};


UCLASS(Blueprintable, BlueprintType)
class YOURPROJECTNAME_API AMyGameState : public AGameStateBase
{
    GENERATED_BODY()


public:
    UPROPERTY(BlueprintReadWrite, Replicated)
    EGamePhase CurrentGamePhase;


    UPROPERTY(BlueprintReadWrite, Replicated)
    APlayerState* CurrentPlayer;


    UPROPERTY(BlueprintReadWrite, Replicated)
    TArray<APlayerState*> PlayersInMatch;


    UPROPERTY(BlueprintReadWrite, Replicated)
    TMap<APlayerState*, int32> SetsWon;


    UPROPERTY(BlueprintReadWrite, Replicated)
    int32 WinningPlayerIndexMatch = -1;


    TArray<class ABall*> ActiveBalls;


    UPROPERTY(BlueprintReadWrite, Replicated)
    TArray<bool> BallPocketed;


    UPROPERTY(BlueprintReadWrite, Replicated)
    int32 LowestNumberedBall;


    UPROPERTY(BlueprintReadWrite, Replicated)
    bool bFoulOccurred;


    UPROPERTY(BlueprintReadWrite, Replicated)
    EFoulType LastFoulType;




    UPROPERTY(BlueprintReadWrite, Replicated)
    int32 CurrentTurnNumber = 0;


    UPROPERTY(BlueprintReadWrite, Replicated)
    TMap<APlayerState*, float> PlayerSkillRating;


    UFUNCTION(BlueprintCallable, BlueprintPure)
    int32 GetLowestNumberedBall();


    UFUNCTION(BlueprintCallable, Server, Reliable)
    void HandlePlayerShot(FVector CueBallVelocity);


    UFUNCTION(BlueprintCallable, Server, Reliable)
    void HandleBallPocketed(int32 BallIndex, FVector PocketLocation);


    UFUNCTION(BlueprintCallable, Server, Reliable)
    void ReportFirstContact(int32 BallIndex);


    UFUNCTION(BlueprintCallable)
    void CheckForFouls(int32 FirstContactBall);


    UFUNCTION(BlueprintCallable, BlueprintPure)
    bool IsGameOverSet();


    UFUNCTION(BlueprintCallable, BlueprintPure)
    bool IsGameOverMatch();





    UFUNCTION(BlueprintCallable, Server, Reliable)
    void EndTurn();


    UFUNCTION(BlueprintCallable, Server, Reliable)
    void StartNewSet(TArray<APlayerState*> NewPlayers);


    UFUNCTION(BlueprintCallable, Server, Reliable)
    void StartNewMatch(TArray<APlayerState*> NewPlayers);


    UFUNCTION(BlueprintCallable, Server, Reliable)
    void UpdatePlayerSkill(APlayerState* Winner, APlayerState* Loser);


    UFUNCTION(BlueprintCallable, BlueprintPure)
    TArray<APlayerState*> GetFairMatchPairing(TArray<APlayerState*> AvailablePlayers);


    void PopulateActiveBalls();
    void InitializeBallPocketed();
    void CheckForMatchOver();
    void UpdateLowestNumberedBall();
};
