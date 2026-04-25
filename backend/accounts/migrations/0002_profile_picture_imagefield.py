# Generated for DakshyaAI profile dashboard media support.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="userprofile",
            name="profile_picture",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to="profile_pictures/",
            ),
        ),
    ]
