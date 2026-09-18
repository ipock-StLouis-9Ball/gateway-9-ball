#include "PoolCuePlayer.h"
#include "GameFramework/PlayerController.h"
#include "Components/InputComponent.h"


APoolCuePlayer::APoolCuePlayer()
{
    PrimaryActorTick.bCanEverTick = true;


    // Root component will be the cue stick base position (pivot)
    RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));


    // Set up the Cue Stick Mesh
    CueStickMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("CueStick"));
    CueStickMesh->SetupAttachment(RootComponent);
    // Offset the mesh so the tip is at the pivot point
    CueStickMesh->SetRelativeLocation(FVector(-150.0f, 0.0f, 0.0f));


    // Set up the Spring Arm (The "Boom")
    CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
    CameraBoom->SetupAttachment(RootComponent);
    CameraBoom->TargetArmLength = BoomLength;
    CameraBoom->bUsePawnControlRotation = false; // We want manual control for precision
    CameraBoom->SetRelativeRotation(FRotator(AimPitch, 180.0f, 0.0f)); // Look down the stick
    CameraBoom->SocketOffset = CameraOffset;


    // Set up the Camera
    AimCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("AimCamera"));
    AimCamera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName);
    AimCamera->bUsePawnControlRotation = false;
}


void APoolCuePlayer::BeginPlay()
{
    Super::BeginPlay();
}


void APoolCuePlayer::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);
    ApplyCameraSway(DeltaTime);
}


void APoolCuePlayer::ApplyCameraSway(float DeltaTime)
{
    SwayTimer += DeltaTime * SwaySpeed;

    // Subtle figure-8 or sine sway to simulate standing/breathing
    float HorizontalSway = FMath::Sin(SwayTimer) * SwayAmount;
    float VerticalSway = FMath::Cos(SwayTimer * 0.5f) * (SwayAmount * 0.5f);

    CameraBoom->SocketOffset = CameraOffset + FVector(0.0f, HorizontalSway, VerticalSway);
}


void APoolCuePlayer::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    Super::SetupPlayerInputComponent(PlayerInputComponent);


    PlayerInputComponent->BindAxis("RotateAim", this, &APoolCuePlayer::RotateAim);
    PlayerInputComponent->BindAxis("AdjustPower", this, &APoolCuePlayer::AdjustPower);
}


void APoolCuePlayer::RotateAim(float AxisValue)
{
    if (AxisValue != 0.0f)
    {
        AddActorLocalRotation(FRotator(0.0f, AxisValue, 0.0f));
    }
}


void APoolCuePlayer::AdjustPower(float AxisValue)
{
    CurrentShotPower = FMath::Clamp(CurrentShotPower + AxisValue, 0.0f, 100.0f);

    // Visually pull back the cue stick based on power
    float PullBackDistance = (CurrentShotPower / 100.0f) * -30.0f;
    CueStickMesh->SetRelativeLocation(FVector(-150.0f + PullBackDistance, 0.0f, 0.0f));
}
