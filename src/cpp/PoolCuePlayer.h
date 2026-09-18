#pragma once


#include "CoreMinimal.h"
#include "GameFramework/Pawn.h"
#include "Camera/CameraComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "PoolCuePlayer.generated.h"


UCLASS()
class YOURPROJECTNAME_API APoolCuePlayer : public APawn
{
    GENERATED_BODY()


public:
    APoolCuePlayer();


protected:
    virtual void BeginPlay() override;


public:
    virtual void Tick(float DeltaTime) override;
    virtual void SetupPlayerInputComponent(class UInputComponent* PlayerInputComponent) override;


    // --- Components ---

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Camera")
    USpringArmComponent* CameraBoom;


    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Camera")
    UCameraComponent* AimCamera;


    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Mesh")
    UStaticMeshComponent* CueStickMesh;


    // --- Camera Settings ---


    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Camera")
    float BoomLength = 120.0f;


    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Camera")
    FVector CameraOffset = FVector(0.0f, 0.0f, 40.0f); // Slightly above the stick


    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Camera")
    float AimPitch = -15.0f; // Aiming slightly down


    // --- Aiming Logic ---

    UFUNCTION(BlueprintCallable, Category = "Aiming")
    void RotateAim(float AxisValue);


    UFUNCTION(BlueprintCallable, Category = "Aiming")
    void AdjustPower(float AxisValue);


    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Camera|Effects")
    float SwayAmount = 0.5f;


    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Camera|Effects")
    float SwaySpeed = 1.2f;


    float SwayTimer = 0.0f;


    void ApplyCameraSway(float DeltaTime);
};
